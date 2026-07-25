import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class Agent extends Document {
  @Prop({ required: true, unique: true, index: true })
  agentId: string; // Format: "AGT-001", "AGT-002", etc.

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, index: true })
  phoneNumber: string;

  @Prop()
  email?: string;

  @Prop({ index: true })
  state?: string; // Nigerian state

  @Prop({ index: true })
  lga?: string; // Local Government Area

  @Prop()
  bustop?: string; // Bus stop location

  @Prop({ default: "active", index: true })
  status: string; // 'active' | 'inactive' | 'suspended'

  @Prop()
  notes?: string; // Admin notes about the agent

  @Prop({ unique: true, sparse: true, index: true })
  referralCode?: string; // 8-char alphanumeric referral code for merchants

  @Prop()
  bankCode?: string;

  @Prop()
  bankName?: string;

  @Prop()
  accountNumber?: string;

  @Prop()
  accountName?: string;

  @Prop({ unique: true, sparse: true, index: true })
  subaccountCode?: string; // Paystack subaccount code

  createdAt?: Date;
  updatedAt?: Date;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);
export type AgentDocument = Agent & Document;

// Indexes
// Standard indexes are handled by @Prop annotations.
// Custom composite indexes or options would go here.
