import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const EXPENSE_PAYMENT_METHODS = [
  "Bank Transfer",
  "Cash",
  "POS",
  "Other",
] as const;
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];
export type ExpenseStatus = "PAID" | "OWING";

/**
 * Money a business spent. A bookkeeping record only: Firespot never moves
 * this money, so it has no fee, payout or collection-limit effect. Kept apart
 * from sales so an owed expense never offsets an outstanding sale.
 */
@Schema({ timestamps: true, collection: "expenses" })
export class Expense extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  merchantId: Types.ObjectId;

  /** Who recorded it. The merchant until team members can sign in. */
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  recordedBy: Types.ObjectId;

  @Prop({ required: true, unique: true })
  reference: string;

  /** Full amount of the expense, in naira. */
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ type: String, required: true, enum: EXPENSE_PAYMENT_METHODS })
  paymentMethod: ExpensePaymentMethod;

  /** Paid so far: the first payment plus every repayment. */
  @Prop({ required: true })
  amountPaid: number;

  @Prop({ required: true })
  balanceOwed: number;

  @Prop({ type: String, required: true, enum: ["PAID", "OWING"] })
  status: ExpenseStatus;

  /** Optional date the balance is due; only kept while something is owed. */
  @Prop()
  dueDate?: Date;

  @Prop({ type: Types.ObjectId, ref: "Supplier" })
  supplierId?: Types.ObjectId;

  /** Copied when recorded, so the expense still reads right if the contact changes. */
  @Prop()
  supplierName?: string;

  @Prop()
  supplierPhone?: string;

  @Prop({
    type: [
      {
        amount: Number,
        paymentMethod: String,
        recordedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  repayments: Array<{
    amount: number;
    paymentMethod: ExpensePaymentMethod;
    recordedAt: Date;
  }>;

  /** Store or location it belongs to, as on a sale. */
  @Prop()
  location?: string;

  @Prop({ required: true })
  recordedAt: Date;

  @Prop({ default: false })
  hasBeenEdited: boolean;

  @Prop({ default: false, index: true })
  isArchived: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
export type ExpenseDocument = Expense & Document;

ExpenseSchema.index({ merchantId: 1, isArchived: 1, recordedAt: -1 });
