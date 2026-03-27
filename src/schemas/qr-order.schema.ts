import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema({ timestamps: true })
export class QROrder extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  merchantId: Types.ObjectId

  @Prop({ required: true })
  quantity: number

  @Prop({ required: true })
  phoneNumber: string

  @Prop({ required: true })
  state: string

  @Prop({ required: true })
  deliveryAddress: string

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

  @Prop()
  paidAt?: Date

  createdAt?: Date
  updatedAt?: Date
}

export const QROrderSchema = SchemaFactory.createForClass(QROrder)
export type QROrderDocument = QROrder & Document

// Indexes
QROrderSchema.index({ merchantId: 1, createdAt: -1 })
QROrderSchema.index({ paystackReference: 1 }, { sparse: true })
