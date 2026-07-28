import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Feedback, FeedbackDocument } from "../schemas/feedback.schema";
import { Sale, SaleDocument } from "../schemas/sale.schema";
import { QRKit, QRKitDocument } from "../schemas/qrkit.schema";
import { User, UserDocument } from "../schemas/user.schema";
import { getEffectiveTier } from "../merchant-plans/constants/plans";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name)
    private readonly feedbackModel: Model<FeedbackDocument>,
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
    @InjectModel(QRKit.name) private readonly qrKitModel: Model<QRKitDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private hasFeedbackAccess(user: UserDocument) {
    const tier = getEffectiveTier(user);
    return tier === "PRO" || tier === "PROMAX";
  }

  private async resolveEligibility(
    saleId: string,
    serialNumber: string,
    customerFingerprint?: string,
  ) {
    if (
      !Types.ObjectId.isValid(saleId) ||
      !serialNumber?.trim() ||
      !customerFingerprint
    ) {
      return { eligible: false as const, reason: "not_eligible" as const };
    }

    const normalizedSerial = serialNumber.trim().toUpperCase();
    const sale = await this.saleModel.findOne({
      _id: new Types.ObjectId(saleId),
      serialNumber: normalizedSerial,
      status: "CONFIRMED",
      isPaidInFull: { $ne: false },
    });

    if (
      !sale ||
      !sale.customerFingerprint ||
      sale.customerFingerprint !== customerFingerprint
    ) {
      return { eligible: false as const, reason: "not_eligible" as const };
    }

    const [qrKit, merchant, existing] = await Promise.all([
      this.qrKitModel.findOne({
        serialNumber: normalizedSerial,
        merchantId: sale.merchantId,
        activationStatus: "activated",
      }),
      this.userModel.findById(sale.merchantId),
      this.feedbackModel.findOne({ saleId: sale._id }).select("_id"),
    ]);

    if (existing) {
      return { eligible: false as const, reason: "submitted" as const };
    }

    if (
      !qrKit?.collectFeedback ||
      !merchant ||
      !this.hasFeedbackAccess(merchant)
    ) {
      return { eligible: false as const, reason: "disabled" as const };
    }

    return { eligible: true as const, sale, qrKit, merchant };
  }

  async getEligibility(
    saleId: string,
    serialNumber: string,
    customerFingerprint?: string,
  ) {
    const result = await this.resolveEligibility(
      saleId,
      serialNumber,
      customerFingerprint,
    );

    return {
      eligible: result.eligible,
      reason: result.eligible ? null : result.reason,
    };
  }

  async create(dto: CreateFeedbackDto, customerFingerprint?: string) {
    const eligibility = await this.resolveEligibility(
      dto.saleId,
      dto.serialNumber,
      customerFingerprint,
    );

    if (!eligibility.eligible) {
      if (eligibility.reason === "submitted") {
        throw new BadRequestException("Feedback has already been submitted");
      }
      throw new ForbiddenException(
        "Feedback is not available for this payment",
      );
    }

    const { sale, qrKit, merchant } = eligibility;
    const comment = dto.comment.trim();
    if (!comment) {
      throw new BadRequestException("Feedback comment is required");
    }
    let customerName = sale.customerName?.trim() || "Firespot customer";
    let customerPhotoUrl: string | undefined;

    if (sale.customerUserId) {
      const customer = await this.userModel
        .findById(sale.customerUserId)
        .select("firstName lastName profilePhotoUrl");
      if (customer) {
        customerName =
          [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
          customerName;
        customerPhotoUrl = customer.profilePhotoUrl;
      }
    }

    try {
      const feedback = await this.feedbackModel.create({
        merchantId: merchant._id,
        qrKitId: qrKit._id,
        saleId: sale._id,
        customerUserId: sale.customerUserId,
        customerFingerprint,
        customerName,
        customerPhotoUrl,
        rating: dto.rating,
        comment,
      });
      return { id: feedback._id, submitted: true };
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        throw new BadRequestException("Feedback has already been submitted");
      }
      throw error;
    }
  }

  async listForMerchant(userId: string, page = 1, limit = 20) {
    const merchant = await this.userModel.findById(userId);
    if (!merchant) throw new NotFoundException("Merchant not found");
    if (!this.hasFeedbackAccess(merchant)) {
      throw new ForbiddenException("Feedback is available on PRO and PRO MAX");
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const merchantId = new Types.ObjectId(userId);

    const [data, total, summary] = await Promise.all([
      this.feedbackModel
        .find({ merchantId })
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      this.feedbackModel.countDocuments({ merchantId }),
      this.feedbackModel.aggregate<{ averageRating: number }>([
        { $match: { merchantId } },
        { $group: { _id: null, averageRating: { $avg: "$rating" } } },
      ]),
    ]);

    return {
      data: data.map((feedback) => ({
        _id: feedback._id,
        saleId: feedback.saleId,
        qrKitId: feedback.qrKitId,
        customerName: feedback.customerName,
        customerPhotoUrl: feedback.customerPhotoUrl,
        rating: feedback.rating,
        comment: feedback.comment,
        createdAt: feedback.createdAt,
      })),
      summary: {
        count: total,
        averageRating: summary[0]?.averageRating || 0,
      },
      meta: {
        page: safePage,
        lastPage: Math.ceil(total / safeLimit) || 1,
        total,
      },
    };
  }
}
