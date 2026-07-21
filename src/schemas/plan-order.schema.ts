import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

/**
 * A merchant's purchase of a plan tier. Mirrors QROrder's payment lifecycle:
 * created PENDING, flipped to SUCCESSFUL by verify or the Paystack webhook.
 */
@Schema({ timestamps: true })
export class PlanOrder extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  merchantId: Types.ObjectId

  @Prop({ required: true, enum: ['LITE', 'PRO', 'PROMAX'] })
  tier: string

  // Naira (converted to kobo when initializing with Paystack)
  @Prop({ required: true })
  amount: number

  // Stores billed on this order (PRO MAX); 1 for LITE/PRO
  @Prop({ default: 1 })
  storeCount: number

  @Prop({ enum: ['one_time', 'monthly'], default: 'one_time' })
  billingType: string

  @Prop({
    enum: ['PENDING', 'SUCCESSFUL', 'FAILED'],
    default: 'PENDING',
    index: true,
  })
  paymentStatus: string

  @Prop({ unique: true, sparse: true, index: true })
  paystackReference?: string

  @Prop()
  paystackAccessCode?: string

  @Prop()
  paidAt?: Date

  createdAt?: Date
  updatedAt?: Date
}

export const PlanOrderSchema = SchemaFactory.createForClass(PlanOrder)
export type PlanOrderDocument = PlanOrder & Document

PlanOrderSchema.index({ merchantId: 1, createdAt: -1 })
