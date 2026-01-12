import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Scan extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  merchantId: Types.ObjectId;

  // Customer identification (based on fingerprinting)
  @Prop()
  customerFingerprint?: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop({ required: true, index: true })
  scannedAt: Date;

  @Prop()
  bankSelected?: string;

  @Prop({ default: false })
  transferInitiated: boolean;

  @Prop()
  deviceType: string; // 'mobile' | 'tablet' | 'desktop'

  @Prop()
  browserType: string;
}

export const ScanSchema = SchemaFactory.createForClass(Scan);

// Compound indexes for efficient queries
ScanSchema.index({ merchantId: 1, scannedAt: -1 });
ScanSchema.index({ merchantId: 1, customerFingerprint: 1 });
ScanSchema.index({ scannedAt: -1 });
