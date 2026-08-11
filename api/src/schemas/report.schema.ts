import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

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

  @Prop({ enum: ["pending", "in_review", "resolved"], default: "pending", index: true })
  status: string;

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
