import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema({ timestamps: true })
export class MerchantRewardLedger extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  merchantId: Types.ObjectId

  @Prop({
    type: Types.ObjectId,
    ref: 'MerchantReferral',
    required: true,
    unique: true,
  })
  referralId: Types.ObjectId

  @Prop({ enum: ['MERCHANT_REFERRAL'], default: 'MERCHANT_REFERRAL' })
  type: 'MERCHANT_REFERRAL'

  @Prop({ required: true, min: 0 })
  amount: number

  @Prop({ default: 'NGN' })
  currency: 'NGN'

  @Prop({ enum: ['EARNED'], default: 'EARNED', index: true })
  status: 'EARNED'

  @Prop({ required: true })
  policyKey: string

  @Prop({ required: true })
  description: string

  @Prop({ default: Date.now })
  earnedAt: Date

  createdAt?: Date
  updatedAt?: Date
}

export const MerchantRewardLedgerSchema =
  SchemaFactory.createForClass(MerchantRewardLedger)
export type MerchantRewardLedgerDocument = MerchantRewardLedger & Document

MerchantRewardLedgerSchema.index({ merchantId: 1, earnedAt: -1 })
