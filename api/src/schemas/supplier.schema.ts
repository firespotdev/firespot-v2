import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * A contact a merchant buys from. Only a saved name and phone: the supplier
 * gets no account and is never notified.
 */
@Schema({ timestamps: true, collection: "suppliers" })
export class Supplier extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  /** International form, e.g. +2348031234567. */
  @Prop({ required: true })
  phoneNumber: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
export type SupplierDocument = Supplier & Document;

SupplierSchema.index({ merchantId: 1, name: 1 });
