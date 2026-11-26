import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { REPORT_DECISIONS, REPORT_STATUSES } from "../reports/report-rules";

@Schema({ timestamps: true })
export class Report extends Document {
  @Prop({ type: Types.ObjectId, ref: "Sale", required: true, index: true })
  saleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  proofUrl?: string;

  @Prop()
  proofPublicId?: string;

  @Prop({ enum: [...REPORT_STATUSES], default: "pending", index: true })
  status: string;

  /** Who the Firespot team ruled for, set when the report is resolved. */
  @Prop({ enum: [...REPORT_DECISIONS] })
  decision?: string;

  /** What the customer is told when the report is resolved. */
  @Prop()
  resolutionNote?: string;

  /** Each time the customer nudged the team about this report. */
  @Prop({ type: [Date], default: [] })
  followUps: Date[];

  /** Set when the customer closes the report themselves. */
  @Prop()
  closedAt?: Date;

  @Prop({ type: Array, default: [] })
  internalNotes: Array<{ adminId: string; note: string; at: Date }>;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  resolvedByAdminId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
export type ReportDocument = Report & Document;

ReportSchema.index({ merchantId: 1, createdAt: -1 });
