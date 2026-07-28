import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type MerchantReferralStatus =
  | 'ATTRIBUTED'
  | 'VOLUME_QUALIFIED'
  | 'ELIGIBILITY_PENDING'
  | 'LEDGERED'
  | 'DISQUALIFIED'

@Schema({ timestamps: true })
export class MerchantReferral extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  referrerMerchantId: Types.ObjectId

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  referredMerchantId: Types.ObjectId

  @Prop({ required: true, uppercase: true, index: true })
  referralCode: string

  @Prop({
    enum: [
      'ATTRIBUTED',
      'VOLUME_QUALIFIED',
      'ELIGIBILITY_PENDING',
      'LEDGERED',
      'DISQUALIFIED',
    ],
    default: 'ATTRIBUTED',
    index: true,
  })
  status: MerchantReferralStatus

  @Prop({ default: 0 })
  qualifiedVolume: number

  @Prop({ default: 50_000 })
  thresholdAmount: number

  @Prop({ default: Date.now })
  attributedAt: Date

  @Prop()
  volumeQualifiedAt?: Date

  @Prop()
  rewardEligibleAt?: Date

  @Prop({ type: Types.ObjectId, ref: 'MerchantRewardLedger' })
  ledgerEntryId?: Types.ObjectId

  @Prop()
  disqualificationReason?: string

  createdAt?: Date
  updatedAt?: Date
}

export const MerchantReferralSchema =
  SchemaFactory.createForClass(MerchantReferral)
export type MerchantReferralDocument = MerchantReferral & Document

MerchantReferralSchema.index({ referrerMerchantId: 1, createdAt: -1 })
