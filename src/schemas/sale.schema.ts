import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class Sale extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop()
  customerFingerprint?: string;

  @Prop({ enum: ['New', 'Repeat'] })
  customerType?: string;

  @Prop({ enum: ['QR scan', 'Link shared', 'Manual'] })
  source?: string;

  @Prop({ enum: ['PENDING', 'CONFIRMED', 'CANCELLED'], default: 'PENDING', index: true })
  status: string;
  
  @Prop({ index: true, unique: true, sparse: true })
  reference?: string;

  @Prop()
  amount?: number; // In kobo, consistent with Nigerian context if app does so, but here we can keep as raw number

  @Prop()
  description?: string;

  @Prop({ enum: ['Bank Transfer', 'Cash', 'POS', 'Other'] })
  paymentMethod?: string;

  @Prop()
  targetBankName?: string;

  @Prop()
  serialNumber?: string;

  @Prop()
  qrKitName?: string;

  @Prop({ default: 1 })
  customerPurchaseCount?: number;

  @Prop()
  recordedAt?: Date;

  @Prop({ default: false })
  hasBeenEdited?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
export type SaleDocument = Sale & Document;

// Indexes
SaleSchema.index({ merchantId: 1, createdAt: -1 });
SaleSchema.index({ merchantId: 1, recordedAt: -1 });
SaleSchema.index({ status: 1 });
