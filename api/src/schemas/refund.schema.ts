import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const REFUND_STATUSES = [
  "pending_approval",
  "approved",
  "submitting",
  "pending",
  "processing",
  "needs_attention",
  "processed",
  "failed",
  "rejected",
] as const;

export type RefundStatus = (typeof REFUND_STATUSES)[number];

@Schema({ timestamps: true })
export class Refund extends Document {
  @Prop({ type: Types.ObjectId, ref: "Sale", required: true, index: true })
  saleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true, index: true })
  transactionReference: string;

  @Prop()
  transactionId?: number;

  @Prop({ index: true, unique: true, sparse: true })
  paystackRefundId?: number;

  @Prop({ index: true, sparse: true })
  paystackRefundReference?: string;

  @Prop({ required: true, min: 1 })
  amountKobo: number;

  @Prop({ default: "NGN" })
  currency: string;

  @Prop({ type: String, enum: REFUND_STATUSES, required: true, index: true })
  status: RefundStatus;

  @Prop({ default: false })
  approvalRequired: boolean;

  @Prop({ required: true, unique: true, index: true })
  idempotencyKey: string;

  @Prop()
  customerNote?: string;

  @Prop()
  merchantNote?: string;

  @Prop()
  approvalReason?: string;

  @Prop()
  failureReason?: string;

  @Prop()
  approvedByAdminId?: string;

  @Prop()
  rejectedByAdminId?: string;

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  submittedAt?: Date;

  @Prop()
  processedAt?: Date;

  @Prop()
  expectedAt?: Date;

  @Prop({ type: Array, default: [] })
  audit: Array<{
    action: string;
    actorType: "merchant" | "admin" | "paystack" | "system";
    actorId?: string;
    note?: string;
    at: Date;
  }>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RefundSchema = SchemaFactory.createForClass(Refund);
export type RefundDocument = Refund & Document;

RefundSchema.index({ merchantId: 1, createdAt: -1 });
RefundSchema.index({ status: 1, createdAt: -1 });
