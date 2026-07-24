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

  // Payer's name when the payment was initiated by a logged-in personal account
  @Prop()
  customerName?: string;

  // Global, merchant-independent customer identity. For debt this is required;
  // it may point to a phone-linked placeholder User until OTP registration.
  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  customerUserId?: Types.ObjectId;

  @Prop({ enum: ['QR scan', 'Link shared', 'Manual'] })
  source?: string;

  @Prop({ enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'OUTSTANDING'], default: 'PENDING', index: true })
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

  @Prop({ default: false, index: true })
  isArchived?: boolean;

  @Prop()
  isPaidInFull?: boolean;

  @Prop()
  amountPaid?: number;

  @Prop()
  totalDue?: number;

  @Prop()
  balanceOwed?: number;

  // Merchant-specific relationship used for their chosen display name/list.
  @Prop({ type: Types.ObjectId, ref: "MerchantCustomer", index: true })
  customerId?: Types.ObjectId;

  @Prop({
    type: [{
      productId: String,
      productName: String,
      price: Number,
      quantity: Number,
      selectedVariant: {
        size: String,
        color: String,
      },
    }],
    default: [],
  })
  items?: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    selectedVariant?: {
      size?: string;
      color?: string;
    };
  }>;

  @Prop()
  receiptUrl?: string;

  @Prop()
  receiptPublicId?: string;

  @Prop()
  customerMarkedPaidAt?: Date;

  @Prop({ enum: ['merchant', 'customer'] })
  cancelledBy?: 'merchant' | 'customer';

  @Prop()
  dueDate?: Date;

  @Prop({ default: false, index: true })
  isCollection?: boolean;

  @Prop({ default: false })
  isScanned?: boolean;

  @Prop({ default: false })
  isCopied?: boolean;

  @Prop()
  location?: string;

  @Prop({
    type: [{
      amount: Number,
      paymentMethod: String,
      recordedAt: { type: Date, default: Date.now },
    }],
    default: [],
  })
  repayments?: Array<{
    amount: number;
    paymentMethod: string;
    recordedAt?: Date;
  }>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
export type SaleDocument = Sale & Document;

// Indexes
SaleSchema.index({ merchantId: 1, createdAt: -1 });
SaleSchema.index({ merchantId: 1, recordedAt: -1 });
SaleSchema.index({ merchantId: 1, customerUserId: 1, status: 1 });
