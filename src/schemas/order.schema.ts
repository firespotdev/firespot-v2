import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  deliveryAddress: string;

  @Prop({ required: true })
  subtotal: number; // For e.g. 5000 for 2 kits at 2500 each 

  @Prop({ required: true, default: 2000 })
  deliveryFee: number; // Flat fee 2000

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ enum: ['PENDING', 'SUCCESSFUL', 'FAILED'], default: 'PENDING', index: true })
  paymentStatus: string;

  @Prop({ unique: true, sparse: true, index: true })
  paystackReference?: string;

  @Prop()
  paystackAccessCode?: string;

  @Prop()
  paidAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
export type OrderDocument = Order & Document;

// Indexes
OrderSchema.index({ merchantId: 1, createdAt: -1 });
OrderSchema.index({ paystackReference: 1 }, { sparse: true });
