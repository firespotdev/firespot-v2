import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Schema as MongooseSchema } from 'mongoose'

export const PAYSTACK_WEBHOOK_STATUSES = [
  'pending',
  'processing',
  'failed',
  'processed',
  'dead_letter',
] as const

export type PaystackWebhookStatus = (typeof PAYSTACK_WEBHOOK_STATUSES)[number]

@Schema({ timestamps: true })
export class PaystackWebhookEvent extends Document {
  @Prop({ required: true, unique: true, index: true })
  eventKey: string

  @Prop({ required: true, index: true })
  event: string

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  data: Record<string, unknown>

  @Prop({
    type: String,
    enum: PAYSTACK_WEBHOOK_STATUSES,
    default: 'pending',
    index: true,
  })
  status: PaystackWebhookStatus

  @Prop({ default: 0 })
  attempts: number

  @Prop({ required: true, index: true })
  nextAttemptAt: Date

  @Prop({ index: true })
  lockedAt?: Date

  @Prop()
  processedAt?: Date

  @Prop()
  lastError?: string

  createdAt?: Date
  updatedAt?: Date
}

export const PaystackWebhookEventSchema =
  SchemaFactory.createForClass(PaystackWebhookEvent)
export type PaystackWebhookEventDocument = PaystackWebhookEvent & Document

PaystackWebhookEventSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 })
