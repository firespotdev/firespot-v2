import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class PaystackDispute extends Document {
  @Prop({ required: true, unique: true, index: true })
  paystackDisputeId: number;

  @Prop({ type: Types.ObjectId, ref: "Sale", index: true })
  saleId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  merchantId?: Types.ObjectId;

  @Prop({ index: true })
  transactionReference?: string;

  @Prop()
  transactionId?: number;

  @Prop({ required: true, min: 0 })
  amountKobo: number;

  @Prop({ default: 0 })
  refundAmountKobo: number;

  @Prop({ default: "NGN" })
  currency: string;

  @Prop({ required: true, index: true })
  status: string;

  @Prop()
  category?: string;

  @Prop()
  resolution?: string;

  @Prop()
  dueAt?: Date;

  @Prop({ index: true })
  adminAcceptanceAvailableAt?: Date;

  @Prop()
  lastMerchantReminderAt?: Date;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  decisionClaimedAt?: Date;

  @Prop()
  decisionClaimedBy?: string;

  @Prop({ type: Array, default: [] })
  evidence: Array<{
    evidenceId?: number;
    filename?: string;
    description?: string;
    url?: string;
    uploadedAt: Date;
  }>;

  @Prop({ type: Array, default: [] })
  internalNotes: Array<{ adminId: string; note: string; at: Date }>;

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

export const PaystackDisputeSchema =
  SchemaFactory.createForClass(PaystackDispute);
export type PaystackDisputeDocument = PaystackDispute & Document;

PaystackDisputeSchema.index({ merchantId: 1, createdAt: -1 });
PaystackDisputeSchema.index({ status: 1, dueAt: 1 });
