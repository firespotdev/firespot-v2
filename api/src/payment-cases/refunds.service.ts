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
  PaystackService,
  PaystackRefund,
} from "../users/services/paystack.service";
import { Sale, SaleDocument } from "../schemas/sale.schema";
import { Refund, RefundDocument, RefundStatus } from "../schemas/refund.schema";
import {
  PaystackDispute,
  PaystackDisputeDocument,
} from "../schemas/paystack-dispute.schema";
import { CreateRefundDto, RetryRefundDto } from "./dto/payment-cases.dto";
import { requiresRefundApproval } from "./payment-cases.rules";

const ACTIVE_DISPUTE_STATUSES = [
  "awaiting-merchant-feedback",
  "awaiting-bank-feedback",
  "pending",
];

const REFUND_RECONCILE_INTERVAL_MS = 15 * 60_000;

@Injectable()
export class RefundsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RefundsService.name);
  private readonly approvalThresholdKobo: number;
  private timer?: ReturnType<typeof setInterval>;
  private reconciling = false;

  constructor(
    @InjectModel(Refund.name) private refundModel: Model<RefundDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(PaystackDispute.name)
    private disputeModel: Model<PaystackDisputeDocument>,
    private paystackService: PaystackService,
    configService: ConfigService,
  ) {
    const thresholdNaira = Number(
      configService.get<string>(
        "PAYSTACK_REFUND_ADMIN_APPROVAL_THRESHOLD_NAIRA",
        "500000",
      ),
    );
    if (!Number.isFinite(thresholdNaira) || thresholdNaira <= 0) {
      throw new Error(
        "PAYSTACK_REFUND_ADMIN_APPROVAL_THRESHOLD_NAIRA must be a positive number",
      );
    }
    this.approvalThresholdKobo = Math.round(thresholdNaira * 100);
  }

  onModuleInit() {
    this.timer = setInterval(
      () => void this.reconcile().catch((error) => this.logger.error(error)),
      REFUND_RECONCILE_INTERVAL_MS,
    );
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async reconcile() {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
      const refunds = await this.refundModel
        .find({
          status: { $in: ["pending", "processing", "needs_attention"] },
          paystackRefundId: { $exists: true },
        })
        .limit(100)
        .exec();
      for (const refund of refunds) {
        try {
          const provider = await this.paystackService.fetchRefund(
            refund.paystackRefundId!,
          );
          await this.applyProviderState(refund, provider, "refund_reconciled");
        } catch (error) {
          this.logger.warn(
            `Could not reconcile refund ${refund._id}: ${error}`,
          );
        }
      }
    } finally {
      this.reconciling = false;
    }
  }

  async requestRefund(merchantId: string, dto: CreateRefundDto) {
    const existing = await this.refundModel
      .findOne({
        merchantId: new Types.ObjectId(merchantId),
        idempotencyKey: dto.idempotencyKey,
      })
      .exec();
    if (existing) return existing;

    const sale = await this.saleModel
      .findOne({
        _id: new Types.ObjectId(dto.saleId),
        merchantId: new Types.ObjectId(merchantId),
        status: "CONFIRMED",
        paymentRail: "paystack",
      })
      .exec();
    if (!sale?.paystackReference) {
      throw new NotFoundException("Refundable Paystack sale not found");
    }

    const activeDispute = await this.disputeModel.exists({
      saleId: sale._id,
      status: { $in: ACTIVE_DISPUTE_STATUSES },
    });
    if (activeDispute) {
      throw new ConflictException(
        "This transaction has an active dispute and cannot be refunded separately",
      );
    }

    const originalAmountKobo = Math.round((sale.amount || 0) * 100);
    const reservedSale = await this.saleModel
      .findOneAndUpdate(
        {
          _id: sale._id,
          $expr: {
            $lte: [
              {
                $add: [
                  { $ifNull: ["$refundReservedAmountKobo", 0] },
                  { $ifNull: ["$refundedAmountKobo", 0] },
                  { $ifNull: ["$disputeReversedAmountKobo", 0] },
                  dto.amountKobo,
                ],
              },
              originalAmountKobo,
            ],
          },
        },
        { $inc: { refundReservedAmountKobo: dto.amountKobo } },
        { returnDocument: "after" },
      )
      .exec();
    if (!reservedSale) {
      throw new BadRequestException(
        "Refund exceeds the transaction's remaining refundable amount",
      );
    }

    const cumulativeExposure =
      (reservedSale.refundReservedAmountKobo || 0) +
      (reservedSale.refundedAmountKobo || 0) +
      (reservedSale.disputeReversedAmountKobo || 0);
    const approvalRequired = requiresRefundApproval(
      cumulativeExposure,
      this.approvalThresholdKobo,
    );
    let refund: RefundDocument;
    try {
      refund = await this.refundModel.create({
        saleId: sale._id,
        merchantId: sale.merchantId,
        transactionReference: sale.paystackReference,
        transactionId: sale.paystackTransactionId,
        amountKobo: dto.amountKobo,
        currency: sale.paystackCurrency || "NGN",
        status: approvalRequired ? "pending_approval" : "approved",
        approvalRequired,
        idempotencyKey: dto.idempotencyKey,
        customerNote: dto.customerNote,
        merchantNote: dto.merchantNote,
        audit: [
          {
            action: "refund_requested",
            actorType: "merchant",
            actorId: merchantId,
            at: new Date(),
          },
        ],
      });
    } catch (error: any) {
      await this.saleModel
        .updateOne(
          { _id: sale._id },
          { $inc: { refundReservedAmountKobo: -dto.amountKobo } },
        )
        .exec();
      if (error?.code === 11000) {
        const duplicate = await this.refundModel.findOne({
          merchantId: new Types.ObjectId(merchantId),
          idempotencyKey: dto.idempotencyKey,
        });
        if (duplicate) return duplicate;
      }
      throw error;
    }

    if (!approvalRequired) return this.submit(refund);
    return refund;
  }

  async approve(id: string, adminId: string, reason?: string) {
    this.assertObjectId(id, "refund");
    const refund = await this.refundModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), status: "pending_approval" },
        {
          $set: {
            status: "approved",
            approvedAt: new Date(),
            approvedByAdminId: adminId,
            approvalReason: reason,
          },
          $push: {
            audit: {
              action: "refund_approved",
              actorType: "admin",
              actorId: adminId,
              note: reason,
              at: new Date(),
            },
          },
        },
        { returnDocument: "after" },
      )
      .exec();
    if (!refund)
      throw new ConflictException("Refund is no longer awaiting approval");
    return this.submit(refund);
  }

  async reject(id: string, adminId: string, reason?: string) {
    this.assertObjectId(id, "refund");
    const refund = await this.refundModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), status: "pending_approval" },
        {
          $set: {
            status: "rejected",
            rejectedAt: new Date(),
            rejectedByAdminId: adminId,
            approvalReason: reason,
          },
          $push: {
            audit: {
              action: "refund_rejected",
              actorType: "admin",
              actorId: adminId,
              note: reason,
              at: new Date(),
            },
          },
        },
        { returnDocument: "after" },
      )
      .exec();
    if (!refund)
      throw new ConflictException("Refund is no longer awaiting approval");
    await this.finalizeReservation(refund, false);
    return refund;
  }

  async retryWithCustomerDetails(
    merchantId: string,
    id: string,
    dto: RetryRefundDto,
  ) {
    this.assertObjectId(id, "refund");
    const refund = await this.refundModel
      .findOne({
        _id: new Types.ObjectId(id),
        merchantId: new Types.ObjectId(merchantId),
        status: "needs_attention",
      })
      .exec();
    if (!refund?.paystackRefundId) {
      throw new NotFoundException(
        "Refund needing customer details was not found",
      );
    }
    const provider = await this.paystackService.retryRefundWithCustomerDetails(
      refund.paystackRefundId,
      dto,
    );
    return this.applyProviderState(refund, provider, "refund_retried");
  }

  async findMerchantRefunds(merchantId: string) {
    return this.refundModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(status?: string) {
    return this.refundModel
      .find(status ? { status: status as RefundStatus } : {})
      .populate("merchantId", "businessName fullPhoneNumber")
      .populate("saleId", "reference amount paystackReference")
      .sort({ createdAt: -1 })
      .exec();
  }

  async handleWebhook(event: string, data: PaystackRefund) {
    const id = data?.id;
    const reference = data?.refund_reference;
    const transaction =
      typeof data?.transaction === "object" ? data.transaction : undefined;
    const transactionReference = transaction?.reference;
    const transactionId =
      typeof data?.transaction === "number"
        ? data.transaction
        : transaction?.id;
    const candidates = [
      ...(id ? [{ paystackRefundId: id }] : []),
      ...(reference ? [{ paystackRefundReference: reference }] : []),
      ...(transactionReference
        ? [
            {
              transactionReference,
              amountKobo: data.amount,
              status: {
                $in: ["approved", "submitting", "pending", "processing"],
              },
            },
          ]
        : []),
      ...(transactionId
        ? [
            {
              transactionId,
              amountKobo: data.amount,
              status: {
                $in: ["approved", "submitting", "pending", "processing"],
              },
            },
          ]
        : []),
    ];
    if (!candidates.length) return;
    const refund = await this.refundModel
      .findOne({ $or: candidates } as any)
      .exec();
    if (!refund) return;
    await this.applyProviderState(
      refund,
      { ...data, status: event.replace("refund.", "") },
      event,
    );
  }

  private async submit(refund: RefundDocument) {
    const claimed = await this.refundModel
      .findOneAndUpdate(
        { _id: refund._id, status: "approved" },
        { $set: { status: "submitting", submittedAt: new Date() } },
        { returnDocument: "after" },
      )
      .exec();
    if (!claimed) return this.refundModel.findById(refund._id).exec();
    try {
      const provider = await this.paystackService.createRefund({
        transaction: claimed.transactionReference,
        amount: claimed.amountKobo,
        currency: claimed.currency,
        customerNote: claimed.customerNote,
        merchantNote: claimed.merchantNote,
      });
      return this.applyProviderState(claimed, provider, "refund_submitted");
    } catch (error) {
      await this.refundModel
        .updateOne(
          { _id: claimed._id, status: "submitting" },
          {
            $set: {
              status: "approved",
              failureReason:
                error instanceof Error ? error.message : String(error),
            },
          },
        )
        .exec();
      throw error;
    }
  }

  private async applyProviderState(
    refund: RefundDocument,
    provider: PaystackRefund,
    action: string,
  ) {
    const status = this.normalizeStatus(provider.status);
    const updated = await this.refundModel
      .findByIdAndUpdate(
        refund._id,
        {
          $set: {
            status,
            paystackRefundId: provider.id || refund.paystackRefundId,
            paystackRefundReference:
              provider.refund_reference || refund.paystackRefundReference,
            expectedAt: provider.expected_at
              ? new Date(provider.expected_at)
              : refund.expectedAt,
            ...(status === "processed" ? { processedAt: new Date() } : {}),
          },
          $push: { audit: { action, actorType: "paystack", at: new Date() } },
        },
        { returnDocument: "after" },
      )
      .exec();
    if (!updated) throw new NotFoundException("Refund not found");
    if (status === "processed") await this.finalizeReservation(updated, true);
    if (status === "failed") await this.finalizeReservation(updated, false);
    return updated;
  }

  private normalizeStatus(status: string): RefundStatus {
    const normalized = status?.replace("refund.", "").replace("-", "_");
    return (
      [
        "pending",
        "processing",
        "needs_attention",
        "processed",
        "failed",
      ] as string[]
    ).includes(normalized)
      ? (normalized as RefundStatus)
      : "pending";
  }

  private async finalizeReservation(
    refund: RefundDocument,
    processed: boolean,
  ) {
    await this.saleModel
      .updateOne(
        { _id: refund.saleId, finalizedRefundIds: { $ne: refund._id } },
        {
          $inc: {
            refundReservedAmountKobo: -refund.amountKobo,
            ...(processed ? { refundedAmountKobo: refund.amountKobo } : {}),
          },
          $addToSet: { finalizedRefundIds: refund._id },
        },
      )
      .exec();
  }

  private assertObjectId(id: string, subject: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${subject} ID`);
    }
  }
}
