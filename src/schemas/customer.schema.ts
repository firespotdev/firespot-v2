import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class Customer extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true, index: true })
  phoneNumber: string;

  @Prop()
  email?: string;

  // The Firespot User this customer maps to (matched/created by phone number).
  // Links merchant-recorded sales into the customer's own Activity feed.
  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  userId?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
export type CustomerDocument = Customer & Document;

CustomerSchema.index({ merchantId: 1, name: 1 });
