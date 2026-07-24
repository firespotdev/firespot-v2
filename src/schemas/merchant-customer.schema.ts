import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, collection: "customers" })
export class MerchantCustomer extends Document {
  // This document is a merchant's relationship with an independent customer
  // identity. The identity itself is User (including phone-linked placeholder
  // users that are claimed when the customer completes OTP registration).
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  // Merchant-specific display name from the "Who owes you?" form.
  @Prop({ required: true, index: true })
  name: string;

  // Denormalized for the merchant customer list. User is authoritative.
  @Prop({ required: true, index: true })
  phoneNumber: string;

  // Global, merchant-independent customer identity.
  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  userId?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MerchantCustomerSchema =
  SchemaFactory.createForClass(MerchantCustomer);
export type MerchantCustomerDocument = MerchantCustomer & Document;

MerchantCustomerSchema.index({ merchantId: 1, name: 1 });
MerchantCustomerSchema.index(
  { merchantId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: "objectId" } },
  },
);
