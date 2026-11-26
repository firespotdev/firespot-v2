import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Report, ReportDocument } from "../schemas/report.schema";
import { CloudinaryService } from "../users/services/cloudinary.service";
import { Sale, SaleDocument } from "../schemas/sale.schema";
import { User, UserDocument } from "../schemas/user.schema";
import { FirebaseService } from "../services/firebase/firebase.service";
import {
  REPORT_CATEGORIES,
  type ReportCategory,
  type ReportDecision,
  type ReportStatus,
  isOpenReport,
  nextFollowUpAt,
  OPEN_REPORT_STATUSES,
} from "./report-rules";

export interface CreateReportInput {
  saleId: string;
  category: ReportCategory;
  description: string;
}

export interface AdminReportUpdate {
  status: Exclude<ReportStatus, "closed">;
  note?: string;
  decision?: ReportDecision;
  resolutionNote?: string;
}

type SaleLike = Pick<
  Sale,
  "amount" | "status" | "reference" | "recordedAt" | "merchantId"
> & { _id: Types.ObjectId; createdAt?: Date; items?: unknown[] };

type MerchantLike = Pick<
  User,
  "businessName" | "businessImageUrl" | "profilePhotoUrl" | "fcmTokens"
> & { _id: Types.ObjectId };

const STATUS_PUSH: Partial<Record<ReportStatus, string>> = {
  in_review: "Firespot is reviewing your report.",
  resolved: "Your report has been resolved. Tap to see the decision.",
};

const toObjectId = (id: string, label: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException(`Invalid ${label} ID`);
  }
  return new Types.ObjectId(id);
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private cloudinaryService: CloudinaryService,
    private firebaseService: FirebaseService,
  ) {}

  private saleDate(sale: SaleLike): Date {
    return sale.recordedAt ?? sale.createdAt ?? new Date(0);
  }

  private async findCustomerSale(customerId: string, saleId: string) {
    const sale = await this.saleModel.findOne({
      _id: toObjectId(saleId, "sale"),
      customerUserId: toObjectId(customerId, "customer"),
    });
    if (!sale) {
      throw new NotFoundException("Transaction not found for this customer");
    }
    return sale;
  }

  private async findMerchant(merchantId: Types.ObjectId) {
    return (await this.userModel
      .findById(merchantId)
      .select(
        "businessName businessImageUrl profilePhotoUrl fcmTokens",
      )) as MerchantLike | null;
  }

  private saleSummary(sale: SaleLike, merchant: MerchantLike | null) {
    return {
      _id: sale._id,
      amount: sale.amount,
      status: sale.status,
      reference: sale.reference,
      date: this.saleDate(sale),
      itemCount: sale.items?.length ?? 0,
      merchant: {
        _id: sale.merchantId,
        businessName: merchant?.businessName,
        imageUrl: merchant?.businessImageUrl || merchant?.profilePhotoUrl,
      },
    };
  }

  private async push(
    tokens: string[] | undefined,
    title: string,
    body: string,
    data: Record<string, string>,
  ) {
    try {
      await this.firebaseService.sendPushNotification(
        tokens ?? [],
        title,
        body,
        data,
      );
    } catch (error) {
      // A failed push must never undo the report change itself.
      this.logger.warn(`Report push failed: ${(error as Error).message}`);
    }
  }

  /** The sale as the report screens show it, and whether it can be reported. */
  async saleContext(customerId: string, saleId: string) {
    const sale = await this.findCustomerSale(customerId, saleId);
    const [merchant, openReport] = await Promise.all([
      this.findMerchant(sale.merchantId),
      this.reportModel
        .findOne({
          saleId: sale._id,
          customerId: toObjectId(customerId, "customer"),
          status: { $in: OPEN_REPORT_STATUSES },
        })
        .select("_id status"),
    ]);
    return {
      sale: this.saleSummary(sale, merchant),
      openReport: openReport
        ? { _id: openReport._id, status: openReport.status }
        : null,
      canReport: !openReport,
    };
  }

  async create(
    customerId: string,
    input: CreateReportInput,
    fileBuffer?: Buffer,
  ): Promise<Report> {
    const sale = await this.findCustomerSale(customerId, input.saleId);
    const openReport = await this.reportModel.exists({
      saleId: sale._id,
      customerId: toObjectId(customerId, "customer"),
      status: { $in: OPEN_REPORT_STATUSES },
    });
    if (openReport) {
      throw new ConflictException(
        "An open report already exists for this transaction",
      );
    }

    const proof = fileBuffer
      ? await this.cloudinaryService.uploadDocument(
          fileBuffer,
          "flare/report-evidence",
        )
      : undefined;

    const report = await this.reportModel.create({
      customerId: toObjectId(customerId, "customer"),
      merchantId: sale.merchantId,
      saleId: sale._id,
      category: input.category,
      description: input.description.trim(),
      proofUrl: proof?.url,
      proofPublicId: proof?.publicId,
      status: "pending",
    });

    const merchant = await this.findMerchant(sale.merchantId);
    await this.push(
      merchant?.fcmTokens,
      "A customer reported an issue",
      `${REPORT_CATEGORIES[input.category]} on a ₦${(sale.amount || 0).toLocaleString()} sale. Firespot is reviewing it.`,
      { type: "report_filed", reportId: String(report._id) },
    );

    return report;
  }

  async findAllByCustomer(customerId: string, saleId?: string) {
    return this.reportModel
      .find({
        customerId: toObjectId(customerId, "customer"),
        ...(saleId ? { saleId: toObjectId(saleId, "sale") } : {}),
      })
      .select("-internalNotes -proofPublicId")
      .sort({ createdAt: -1 });
  }

  private async findCustomerReport(id: string, customerId: string) {
    const report = await this.reportModel.findOne({
      _id: toObjectId(id, "report"),
      customerId: toObjectId(customerId, "customer"),
    });
    if (!report) throw new NotFoundException("Report not found");
    return report;
  }

  /** One report with its sale, as the customer's status screen shows it. */
  async findOneForCustomer(id: string, customerId: string) {
    const report = await this.findCustomerReport(id, customerId);
    const sale = await this.saleModel.findById(report.saleId);
    const merchant = await this.findMerchant(report.merchantId);

    return {
      _id: report._id,
      category: report.category,
      description: report.description,
      proofUrl: report.proofUrl,
      status: report.status,
      decision: report.decision,
      resolutionNote: report.resolutionNote,
      resolvedAt: report.resolvedAt,
      closedAt: report.closedAt,
      createdAt: report.createdAt,
      followUpCount: report.followUps?.length ?? 0,
      nextFollowUpAt: nextFollowUpAt(report.followUps ?? []),
      sale: sale ? this.saleSummary(sale, merchant) : null,
    };
  }

  /** The customer nudges the team; allowed once a day while it is open. */
  async followUp(id: string, customerId: string) {
    const report = await this.findCustomerReport(id, customerId);
    if (!isOpenReport(report.status)) {
      throw new BadRequestException("This report is no longer open.");
    }
    if (nextFollowUpAt(report.followUps ?? [])) {
      throw new BadRequestException(
        "You've already followed up today. Try again tomorrow.",
      );
    }
    report.followUps = [...(report.followUps ?? []), new Date()];
    await report.save();
    return this.findOneForCustomer(id, customerId);
  }

  /** The customer withdraws an open report. It can't be reopened. */
  async close(id: string, customerId: string) {
    const report = await this.findCustomerReport(id, customerId);
    if (!isOpenReport(report.status)) {
      throw new BadRequestException("This report is no longer open.");
    }
    report.status = "closed";
    report.closedAt = new Date();
    await report.save();
    return this.findOneForCustomer(id, customerId);
  }

  async findAllForAdmin(status?: string): Promise<Report[]> {
    return this.reportModel
      .find(status ? { status } : {})
      .populate("merchantId", "businessName fullPhoneNumber")
      .populate("customerId", "fullName fullPhoneNumber")
      .populate("saleId", "reference amount description recordedAt")
      .sort({ createdAt: -1 });
  }

  async updateByAdmin(
    id: string,
    adminId: string,
    update: AdminReportUpdate,
  ): Promise<Report> {
    const resolving = update.status === "resolved";
    if (resolving && !update.decision) {
      throw new BadRequestException(
        "Choose who the decision favours before resolving.",
      );
    }
    const current = await this.reportModel.findById(toObjectId(id, "report"));
    if (!current) throw new NotFoundException("Report not found");
    if (current.status === "closed") {
      throw new BadRequestException("The customer closed this report.");
    }

    const report = await this.reportModel.findByIdAndUpdate(
      current._id,
      {
        $set: {
          status: update.status,
          ...(resolving
            ? {
                resolvedAt: new Date(),
                resolvedByAdminId: adminId,
                decision: update.decision,
                resolutionNote: update.resolutionNote?.trim() || undefined,
              }
            : {}),
        },
        ...(update.note
          ? {
              $push: {
                internalNotes: { adminId, note: update.note, at: new Date() },
              },
            }
          : {}),
      },
      { returnDocument: "after" },
    );
    if (!report) throw new NotFoundException("Report not found");

    const message = STATUS_PUSH[update.status as ReportStatus];
    if (message && current.status !== update.status) {
      const customer = await this.userModel
        .findById(report.customerId)
        .select("fcmTokens");
      await this.push(customer?.fcmTokens, "Update on your report", message, {
        type: "report_updated",
        reportId: String(report._id),
      });
    }
    return report;
  }
}
