import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Report, ReportDocument } from "../schemas/report.schema";
import { CloudinaryService } from "../users/services/cloudinary.service";
import { Sale, SaleDocument } from "../schemas/sale.schema";

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    customerId: string,
    saleId: string,
    category: string,
    description: string,
    fileBuffer?: Buffer,
  ): Promise<Report> {
    if (!Types.ObjectId.isValid(saleId)) {
      throw new BadRequestException("Invalid sale ID");
    }
    const sale = await this.saleModel
      .findOne({
        _id: new Types.ObjectId(saleId),
        customerUserId: new Types.ObjectId(customerId),
      })
      .exec();
    if (!sale) {
      throw new NotFoundException("Transaction not found for this customer");
    }
    const openReport = await this.reportModel.exists({
      saleId: sale._id,
      customerId: new Types.ObjectId(customerId),
      status: { $in: ["pending", "in_review"] },
    });
    if (openReport) {
      throw new ConflictException(
        "An open report already exists for this transaction",
      );
    }

    let proofUrl: string | undefined;
    let proofPublicId: string | undefined;

    if (fileBuffer) {
      const upload = await this.cloudinaryService.uploadDocument(
        fileBuffer,
        "flare/report-evidence",
      );
      proofUrl = upload.url;
      proofPublicId = upload.publicId;
    }

    const report = new this.reportModel({
      customerId: new Types.ObjectId(customerId),
      merchantId: sale.merchantId,
      saleId: new Types.ObjectId(saleId),
      category,
      description,
      proofUrl,
      proofPublicId,
      status: "pending",
    });

    return report.save();
  }

  async findAllForAdmin(status?: string): Promise<Report[]> {
    return this.reportModel
      .find(status ? { status } : {})
      .populate("merchantId", "businessName fullPhoneNumber")
      .populate("customerId", "firstName lastName fullPhoneNumber")
      .populate("saleId", "reference amount description recordedAt")
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateByAdmin(
    id: string,
    adminId: string,
    status: "pending" | "in_review" | "resolved",
    note?: string,
  ): Promise<Report> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException("Invalid report ID");
    const report = await this.reportModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status,
            ...(status === "resolved"
              ? { resolvedAt: new Date(), resolvedByAdminId: adminId }
              : {}),
          },
          ...(note
            ? { $push: { internalNotes: { adminId, note, at: new Date() } } }
            : {}),
        },
        { returnDocument: "after" },
      )
      .exec();
    if (!report) throw new NotFoundException("Report not found");
    return report;
  }

  async findAllByCustomer(customerId: string): Promise<Report[]> {
    return this.reportModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, customerId: string): Promise<Report> {
    const report = await this.reportModel
      .findOne({
        _id: new Types.ObjectId(id),
        customerId: new Types.ObjectId(customerId),
      })
      .exec();

    if (!report) {
      throw new NotFoundException("Report not found");
    }
    return report;
  }
}
