import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

/**
 * A physical/branch location belonging to a merchant. PRO MAX is billed per
 * store (one subscription each), so the active store count drives billing.
 */
@Schema({ timestamps: true })
export class Store extends Document {
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

  // Paystack subscription funding this store (PRO MAX only)
  @Prop()
  subscriptionCode?: string

  createdAt?: Date
  updatedAt?: Date
}

export const StoreSchema = SchemaFactory.createForClass(Store)
export type StoreDocument = Store & Document

StoreSchema.index({ merchantId: 1, isActive: 1 })
