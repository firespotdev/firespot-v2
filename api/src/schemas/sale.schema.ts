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

  @Prop()
  customerPhone?: string;

  // Stable opaque alias supplied to Paystack, which requires an email even
  // though Firespot identifies personal users by verified phone number.
  @Prop()
  payerPaystackEmail?: string;

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

  @Prop({
    enum: [
      'Bank Transfer',
      'Cash',
      'POS',
      'Other',
      'Card',
      'Bank',
      'USSD',
      'QR',
      'Apple Pay',
      'Payattitude',
      'Mobile Money',
      'EFT',
      'Capitec Pay',
    ],
  })
  paymentMethod?: string;

  @Prop()
  targetBankName?: string;

  @Prop()
  targetAccountNumber?: string;

  @Prop()
  sourceBankName?: string;

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
  archiveReason?: string;

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
      productDescription: String,
      productImageUrl: String,
      price: Number,
      quantity: Number,
      selectedVariant: { type: Object },
    }],
    default: [],
  })
  items?: Array<{
    productId: string;
    productName: string;
    productDescription?: string;
    productImageUrl?: string;
    price: number;
    quantity: number;
    selectedVariant?: Record<string, unknown>;
  }>;

  @Prop()
  receiptUrl?: string;

  @Prop()
  receiptPublicId?: string;

  @Prop()
  customerMarkedPaidAt?: Date;

  @Prop({ default: false })
  customerMarkedPaidExplicitly?: boolean;

  @Prop({ enum: ['merchant', 'customer'] })
  cancelledBy?: 'merchant' | 'customer';

  @Prop()
  dueDate?: Date;

  @Prop({ default: false, index: true })
  isCollection?: boolean;

  @Prop({ enum: ["manual_transfer", "paystack"], index: true })
  paymentRail?: "manual_transfer" | "paystack";

  @Prop({
    enum: ["initializing", "pending", "success", "failed", "abandoned"],
  })
  paystackAttemptStatus?:
    | "initializing"
    | "pending"
    | "success"
    | "failed"
    | "abandoned";

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

  // Paystack Collection Rail breakdown fields
  @Prop()
  grossAmount?: number;

  @Prop()
  paystackFee?: number;

  @Prop()
  paystackCurrency?: string;

  @Prop()
  paystackDomain?: string;

  @Prop()
  firespotFee?: number;

  @Prop()
  netAmount?: number;

  @Prop({ index: true, unique: true, sparse: true })
  paystackReference?: string;

  @Prop({ index: true, sparse: true })
  paystackTransactionId?: number;

  // Atomic counters used to prevent concurrent refunds exceeding the original
  // Paystack collection. Values are always stored in kobo.
  @Prop({ default: 0, min: 0 })
  refundReservedAmountKobo?: number;

  @Prop({ default: 0, min: 0 })
  refundedAmountKobo?: number;

  @Prop({ default: 0, min: 0 })
  disputeReversedAmountKobo?: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: "Refund" }], default: [] })
  finalizedRefundIds?: Types.ObjectId[];

  @Prop()
  channel?: string;

  @Prop({ enum: ['pending', 'processing', 'success', 'failed'] })
  settlementStatus?: string;

  @Prop()
  capReservationDay?: string;

  @Prop()
  capReservationAmount?: number;

  @Prop({ enum: ['active', 'confirmed', 'released'] })
  capReservationStatus?: string;

  @Prop()
  capReservationLastCheckedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
export type SaleDocument = Sale & Document;

// Indexes
SaleSchema.index({ merchantId: 1, createdAt: -1 });
SaleSchema.index({ merchantId: 1, recordedAt: -1 });
SaleSchema.index({ merchantId: 1, customerUserId: 1, status: 1 });
