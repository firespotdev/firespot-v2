import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class Feedback extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "QRKit", required: true, index: true })
  qrKitId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "Sale",
    required: true,
    unique: true,
    index: true,
  })
  saleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  customerUserId?: Types.ObjectId;

  @Prop({ required: true })
  customerFingerprint: string;

  @Prop({ required: true })
  customerName: string;

  @Prop()
  customerPhotoUrl?: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, maxlength: 500 })
  comment: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
export type FeedbackDocument = Feedback & Document;

FeedbackSchema.index({ merchantId: 1, createdAt: -1 });
