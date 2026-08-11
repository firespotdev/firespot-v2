import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PaystackPaymentAttemptStatus =
  "initializing" | "pending" | "success" | "failed" | "abandoned";

export type PaystackPaymentAttemptDocument = PaystackPaymentAttempt & Document;

@Schema({ timestamps: true })
export class PaystackPaymentAttempt {
  @Prop({ type: Types.ObjectId, ref: "Sale", required: true, index: true })
  saleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  reference: string;

  @Prop({ required: true })
  amountKobo: number;

  @Prop()
  channel?: string;

  @Prop({
    enum: ["initializing", "pending", "success", "failed", "abandoned"],
    default: "initializing",
    index: true,
  })
  status: PaystackPaymentAttemptStatus;

  @Prop()
  authorizationUrl?: string;

  @Prop()
  accessCode?: string;

  @Prop()
  customerFingerprint?: string;

  @Prop()
  capReservationDay?: string;

  @Prop()
  capReservationAmount?: number;

  @Prop({ enum: ["active", "confirmed", "released"] })
  capReservationStatus?: "active" | "confirmed" | "released";

  @Prop()
  verifiedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaystackPaymentAttemptSchema = SchemaFactory.createForClass(
  PaystackPaymentAttempt,
);

PaystackPaymentAttemptSchema.index({ saleId: 1, createdAt: -1 });
PaystackPaymentAttemptSchema.index({
  saleId: 1,
  status: 1,
});
