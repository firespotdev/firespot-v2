import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  PaystackDisputeRecord,
  PaystackService,
} from "../users/services/paystack.service";
import {
  PaystackDispute,
  PaystackDisputeDocument,
} from "../schemas/paystack-dispute.schema";
import { Sale, SaleDocument } from "../schemas/sale.schema";
import { User, UserDocument } from "../schemas/user.schema";
import { SmsService } from "../services/sms/sms.service";
import { FirebaseService } from "../services/firebase/firebase.service";
import { CloudinaryService } from "../users/services/cloudinary.service";
import {
  AddDisputeEvidenceDto,
  ResolveDisputeDto,
} from "./dto/payment-cases.dto";
import { adminCanAcceptDispute } from "./payment-cases.rules";

const RECONCILE_INTERVAL_MS = 15 * 60_000;
const OPEN_STATUSES = [
  "awaiting-merchant-feedback",
  "awaiting-bank-feedback",
  "pending",
];
const MERCHANT_ACTIONABLE_STATUSES = ["awaiting-merchant-feedback"];

@Injectable()
export class DisputesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DisputesService.name);
  private readonly adminAcceptanceLeadMs: number;
  private timer?: ReturnType<typeof setInterval>;
  private reconciling = false;

  constructor(
    @InjectModel(PaystackDispute.name)
    private disputeModel: Model<PaystackDisputeDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private paystackService: PaystackService,
    private smsService: SmsService,
    private firebaseService: FirebaseService,
    private cloudinaryService: CloudinaryService,
    configService: ConfigService,
  ) {
    const minutes = Number(
      configService.get<string>(
        "PAYSTACK_DISPUTE_ADMIN_ACCEPTANCE_LEAD_MINUTES",
        "240",
      ),
    );
    if (!Number.isFinite(minutes) || minutes < 0) {
      throw new Error(
        "PAYSTACK_DISPUTE_ADMIN_ACCEPTANCE_LEAD_MINUTES must be zero or greater",
      );
    }
    this.adminAcceptanceLeadMs = minutes * 60_000;
  }

  onModuleInit() {
    this.timer = setInterval(
      () => void this.reconcile().catch((error) => this.logger.error(error)),
      RECONCILE_INTERVAL_MS,
    );
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async handleWebhook(event: string, data: PaystackDisputeRecord) {
    if (!data?.id) return;
    const dispute = await this.upsertProviderDispute(data, event);
    await this.notifyMerchantOnce(dispute);
  }

  async findMerchantDisputes(merchantId: string) {
    return this.disputeModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(status?: string) {
    return this.disputeModel
      .find(status ? { status } : {})
      .populate("merchantId", "businessName fullPhoneNumber")
      .populate("saleId", "reference amount paystackReference")
      .sort({ dueAt: 1, createdAt: -1 })
      .exec();
  }

  async addEvidence(
    merchantId: string,
    id: string,
    dto: AddDisputeEvidenceDto,
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Evidence file is required");
    if (!["image/jpeg", "application/pdf"].includes(file.mimetype)) {
      throw new BadRequestException(
        "Evidence must be a JPG, JPEG, or PDF file",
      );
    }
    const dispute = await this.ownedOpenDispute(merchantId, id);
    const filename =
      `${dispute.paystackDisputeId}-${Date.now()}-${file.originalname}`.replace(
        /[^a-zA-Z0-9.-]/g,
        "",
      );
    const [upload, persistent] = await Promise.all([
      this.paystackService.getDisputeUploadUrl(
        dispute.paystackDisputeId,
        filename,
      ),
      this.cloudinaryService.uploadEvidence(file.buffer),
    ]);
    await this.paystackService.uploadDisputeEvidenceFile(
      upload.signedUrl,
      file.buffer,
      file.mimetype,
    );
    const evidenceResult = await this.paystackService.addDisputeEvidence(
      dispute.paystackDisputeId,
      dto,
    );
    const evidenceId = evidenceResult?.id || evidenceResult?.evidence_id;
    return this.disputeModel
      .findByIdAndUpdate(
        dispute._id,
        {
          $push: {
            evidence: {
              evidenceId,
              filename: upload.fileName,
              description: dto.serviceDetails,
              url: persistent.url,
              uploadedAt: new Date(),
            },
            audit: {
              action: "evidence_uploaded",
              actorType: "merchant",
              actorId: merchantId,
              at: new Date(),
            },
          },
        },
        { returnDocument: "after" },
      )
      .exec();
  }

  async acceptByMerchant(
    merchantId: string,
    id: string,
    dto: ResolveDisputeDto,
  ) {
    const dispute = await this.ownedOpenDispute(merchantId, id);
    return this.resolve(
      dispute,
      "merchant-accepted",
      dto,
      "merchant",
      merchantId,
    );
  }

  async declineByMerchant(
    merchantId: string,
    id: string,
    dto: ResolveDisputeDto,
  ) {
    const dispute = await this.ownedOpenDispute(merchantId, id);
    const evidenceBelongsToDispute = dispute.evidence.some(
      (evidence) =>
        (dto.evidenceId && evidence.evidenceId === dto.evidenceId) ||
        (dto.uploadedFilename && evidence.filename === dto.uploadedFilename),
    );
    if (!evidenceBelongsToDispute) {
      throw new BadRequestException(
        "Evidence is required to decline a dispute",
      );
    }
    return this.resolve(dispute, "declined", dto, "merchant", merchantId);
  }

  async acceptByAdmin(id: string, adminId: string, message: string) {
    this.assertObjectId(id);
    const dispute = await this.disputeModel.findById(id).exec();
    if (!dispute || !MERCHANT_ACTIONABLE_STATUSES.includes(dispute.status)) {
      throw new NotFoundException("Open dispute not found");
    }
    if (!adminCanAcceptDispute(dispute.adminAcceptanceAvailableAt)) {
      throw new ConflictException(
        "The merchant response window is still open; admin acceptance is not available yet",
      );
    }
    return this.resolve(
      dispute,
      "merchant-accepted",
      { message, refundAmountKobo: dispute.amountKobo },
      "admin",
      adminId,
    );
  }

  async addAdminNote(id: string, adminId: string, note: string) {
    this.assertObjectId(id);
    const dispute = await this.disputeModel
      .findByIdAndUpdate(
        id,
        { $push: { internalNotes: { adminId, note, at: new Date() } } },
        { returnDocument: "after" },
      )
      .exec();
    if (!dispute) throw new NotFoundException("Dispute not found");
    return dispute;
  }

  async remindMerchant(id: string, adminId: string) {
    this.assertObjectId(id);
    const dispute = await this.disputeModel.findById(id).exec();
    if (!dispute?.merchantId || !OPEN_STATUSES.includes(dispute.status)) {
      throw new NotFoundException("Open matched dispute not found");
    }
    await this.sendMerchantNotification(dispute, true);
    dispute.audit.push({
      action: "merchant_reminded",
      actorType: "admin",
      actorId: adminId,
      at: new Date(),
    });
    dispute.lastMerchantReminderAt = new Date();
    return dispute.save();
  }

  async reconcile() {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
      const records = await this.paystackService.listDisputes({ perPage: 100 });
      for (const record of records)
        await this.upsertProviderDispute(record, "reconciled");
    } finally {
      this.reconciling = false;
    }
  }

  private async ownedOpenDispute(merchantId: string, id: string) {
    this.assertObjectId(id);
    const dispute = await this.disputeModel
      .findOne({
        _id: new Types.ObjectId(id),
        merchantId: new Types.ObjectId(merchantId),
        status: { $in: MERCHANT_ACTIONABLE_STATUSES },
      })
      .exec();
    if (!dispute) throw new NotFoundException("Open dispute not found");
    return dispute;
  }

  private async resolve(
    dispute: PaystackDisputeDocument,
    resolution: "merchant-accepted" | "declined",
    dto: ResolveDisputeDto,
    actorType: "merchant" | "admin",
    actorId: string,
  ) {
    if (dto.refundAmountKobo && dto.refundAmountKobo > dispute.amountKobo) {
      throw new BadRequestException(
        "Dispute refund amount cannot exceed the disputed amount",
      );
    }
    const claimed = await this.disputeModel
      .findOneAndUpdate(
        {
          _id: dispute._id,
          status: { $in: MERCHANT_ACTIONABLE_STATUSES },
          decisionClaimedAt: { $exists: false },
        },
        {
          $set: {
            decisionClaimedAt: new Date(),
            decisionClaimedBy: `${actorType}:${actorId}`,
          },
        },
        { returnDocument: "after" },
      )
      .exec();
    if (!claimed)
      throw new ConflictException("A decision is already being processed");
    try {
      const provider = await this.paystackService.resolveDispute(
        claimed.paystackDisputeId,
        {
          resolution,
          message: dto.message,
          refundAmount: dto.refundAmountKobo,
          uploadedFilename: dto.uploadedFilename,
          evidenceId: dto.evidenceId,
        },
      );
      return this.upsertProviderDispute(provider, `${actorType}_resolved`, {
        actorType,
        actorId,
      });
    } catch (error) {
      await this.disputeModel
        .updateOne(
          { _id: claimed._id },
          { $unset: { decisionClaimedAt: 1, decisionClaimedBy: 1 } },
        )
        .exec();
      throw error;
    }
  }

  private async upsertProviderDispute(
    data: PaystackDisputeRecord,
    action: string,
    actor?: { actorType: "merchant" | "admin"; actorId: string },
  ) {
    const transaction =
      typeof data.transaction === "object" ? data.transaction : undefined;
    const transactionId =
      typeof data.transaction === "number" ? data.transaction : transaction?.id;
    const reference = transaction?.reference;
    const saleCandidates = [
      ...(reference ? [{ paystackReference: reference }] : []),
      ...(transactionId ? [{ paystackTransactionId: transactionId }] : []),
    ];
    const sale = saleCandidates.length
      ? await this.saleModel.findOne({ $or: saleCandidates }).exec()
      : null;
    const dueRaw = data.dueAt || data.due_at;
    const dueAt = dueRaw ? new Date(dueRaw) : undefined;
    const adminAcceptanceAvailableAt =
      dueAt && !Number.isNaN(dueAt.getTime())
        ? new Date(dueAt.getTime() - this.adminAcceptanceLeadMs)
        : undefined;
    const resolved = data.status === "resolved";

    const dispute = await this.disputeModel
      .findOneAndUpdate(
        { paystackDisputeId: data.id },
        {
          $set: {
            ...(sale ? { saleId: sale._id, merchantId: sale.merchantId } : {}),
            transactionReference: reference,
            transactionId,
            amountKobo: data.amount || transaction?.amount || 0,
            refundAmountKobo: data.refund_amount || 0,
            currency: data.currency || "NGN",
            status: data.status,
            category: data.category,
            resolution: data.resolution,
            dueAt,
            adminAcceptanceAvailableAt,
            ...(resolved ? { resolvedAt: new Date() } : {}),
          },
          $setOnInsert: { paystackDisputeId: data.id },
          $push: {
            audit: {
              action,
              actorType: actor?.actorType || "paystack",
              actorId: actor?.actorId,
              at: new Date(),
            },
          },
          ...(resolved
            ? { $unset: { decisionClaimedAt: 1, decisionClaimedBy: 1 } }
            : {}),
        },
        { upsert: true, returnDocument: "after" },
      )
      .exec();
    if (!dispute) throw new NotFoundException("Dispute could not be recorded");

    if (resolved && sale && data.resolution === "merchant-accepted") {
      await this.saleModel
        .updateOne(
          {
            _id: sale._id,
            disputeReversedAmountKobo: {
              $lt: data.refund_amount || data.amount,
            },
          },
          {
            $set: {
              disputeReversedAmountKobo: data.refund_amount || data.amount,
            },
          },
        )
        .exec();
    }
    return dispute;
  }

  private async notifyMerchantOnce(dispute: PaystackDisputeDocument) {
    if (!dispute.merchantId || dispute.lastMerchantReminderAt) return;
    const claimed = await this.disputeModel
      .findOneAndUpdate(
        { _id: dispute._id, lastMerchantReminderAt: { $exists: false } },
        { $set: { lastMerchantReminderAt: new Date() } },
        { returnDocument: "after" },
      )
      .exec();
    if (claimed) await this.sendMerchantNotification(claimed, false);
  }

  private async sendMerchantNotification(
    dispute: PaystackDisputeDocument,
    reminder: boolean,
  ) {
    const merchant = await this.userModel.findById(dispute.merchantId).exec();
    if (!merchant) return;
    const amount = `₦${(dispute.amountKobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
    const deadline = dispute.dueAt
      ? dispute.dueAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos" })
      : "the Paystack deadline";
    const body = `${reminder ? "Reminder: " : ""}A ${amount} Paystack dispute needs your response before ${deadline}. Open Firespot to review it.`;
    await Promise.allSettled([
      this.smsService.sendSms(merchant.fullPhoneNumber, body),
      this.firebaseService.sendPushNotification(
        merchant.fcmTokens || [],
        reminder ? "Paystack dispute reminder" : "New Paystack dispute",
        body,
        { disputeId: String(dispute._id), type: "paystack_dispute" },
      ),
    ]);
  }

  private assertObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid dispute ID");
    }
  }
}
