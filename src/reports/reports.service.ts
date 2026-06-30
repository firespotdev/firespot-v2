import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Report, ReportDocument } from "../schemas/report.schema";
import { CloudinaryService } from "../users/services/cloudinary.service";

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    customerId: string,
    saleId: string,
    category: string,
    description: string,
    fileBuffer?: Buffer,
  ): Promise<Report> {
    let proofUrl: string | undefined;
    let proofPublicId: string | undefined;

    if (fileBuffer) {
      const upload = await this.cloudinaryService.uploadImage(fileBuffer);
      proofUrl = upload.url;
      proofPublicId = upload.publicId;
    }

    const report = new this.reportModel({
      customerId: new Types.ObjectId(customerId),
      saleId: new Types.ObjectId(saleId),
      category,
      description,
      proofUrl,
      proofPublicId,
      status: "pending",
    });

    return report.save();
  }

  async findAllByCustomer(customerId: string): Promise<Report[]> {
    return this.reportModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, customerId: string): Promise<Report> {
    const report = await this.reportModel.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(customerId),
    }).exec();

    if (!report) {
      throw new NotFoundException("Report not found");
    }
    return report;
  }
}
