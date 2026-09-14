import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class DailyCollectionUsage extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true })
  dayKey: string;

  // Gross Paystack checkout value reserved by active payment sessions. Sales
  // move out of this bucket when their verified webhook confirms them.
  @Prop({ default: 0, min: 0 })
  reservedAmount: number;
}

export const DailyCollectionUsageSchema =
  SchemaFactory.createForClass(DailyCollectionUsage);
export type DailyCollectionUsageDocument = DailyCollectionUsage & Document;

DailyCollectionUsageSchema.index(
  { merchantId: 1, dayKey: 1 },
  { unique: true },
);
