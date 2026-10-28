import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

function requiresDelivery(this: QROrder) {
  return this.kitType !== 'digital'
}

@Schema({ timestamps: true })
export class QROrder extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  merchantId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'QRKit', index: true })
  qrKitId?: Types.ObjectId

  @Prop({ enum: ['physical', 'digital'], default: 'physical' })
  kitType: 'physical' | 'digital'

  @Prop({ required: true })
  quantity: number

  @Prop({ required: requiresDelivery })
  phoneNumber?: string

  @Prop({ required: requiresDelivery })
  state?: string

  @Prop({ required: requiresDelivery })
  lga?: string

  @Prop({ required: requiresDelivery })
  deliveryAddress?: string

  @Prop({ required: true })
  subtotal: number

  @Prop({ required: true, default: 2000 })
  deliveryFee: number // Flat fee 2000

  @Prop({ required: true })
  totalAmount: number

  @Prop({
    enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING',
    index: true,
  })
  orderStatus: string

  @Prop({
    enum: ['PENDING', 'SUCCESSFUL', 'FAILED'],
    default: 'PENDING',
    index: true,
  })
  paymentStatus: string

  @Prop({ type: [{ type: Types.ObjectId, ref: 'QRKit' }] })
  assignedKitIds: Types.ObjectId[]

  @Prop({ unique: true, sparse: true, index: true })
  paystackReference?: string

  @Prop()
  paystackAccessCode?: string

  @Prop({ default: false })
  liteGranted: boolean

  @Prop()
  paidAt?: Date

  @Prop()
  serialSmsSentAt?: Date

  @Prop()
  fulfilmentError?: string

  @Prop()
  fulfilmentFailedAt?: Date

  createdAt?: Date
  updatedAt?: Date
}

export const QROrderSchema = SchemaFactory.createForClass(QROrder)
export type QROrderDocument = QROrder & Document

// Indexes
QROrderSchema.index({ merchantId: 1, createdAt: -1 })
