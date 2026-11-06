import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

/**
 * A Spot is one merchant location (a branch, shop or stall) with its own
 * public profile. PRO MAX is billed per Spot (one subscription each), so the
 * active Spot count drives billing.
 */
@Schema({ timestamps: true })
export class Spot extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  merchantId: Types.ObjectId

  @Prop({ required: true })
  name: string

  @Prop()
  address?: string

  @Prop()
  location?: string

  @Prop({ default: true, index: true })
  isActive: boolean

  @Prop({ default: false })
  isPrimary: boolean

  @Prop({
    enum: ['pending', 'active', 'cancellation_pending', 'cancelled', 'failed'],
    default: 'active',
  })
  billingStatus: string

  @Prop()
  billingRequestKey?: string

  // Paystack subscription funding this spot (PRO MAX only)
  @Prop({ index: true })
  subscriptionCode?: string

  @Prop()
  subscriptionEmailToken?: string

  createdAt?: Date
  updatedAt?: Date
}

export const SpotSchema = SchemaFactory.createForClass(Spot)
export type SpotDocument = Spot & Document

SpotSchema.index({ merchantId: 1, isActive: 1 })
SpotSchema.index(
  { merchantId: 1, isPrimary: 1 },
  { unique: true, partialFilterExpression: { isPrimary: true } },
)
SpotSchema.index(
  { merchantId: 1, billingRequestKey: 1 },
  {
    unique: true,
    partialFilterExpression: { billingRequestKey: { $type: 'string' } },
  },
)
SpotSchema.index(
  { merchantId: 1, billingStatus: 1 },
  { unique: true, partialFilterExpression: { billingStatus: 'pending' } },
)
