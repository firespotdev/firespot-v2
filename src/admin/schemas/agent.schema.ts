import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({ timestamps: true })
export class Agent extends Document {
  @Prop({ required: true, unique: true, index: true })
  agentId: string // Format: "AGT-001", "AGT-002", etc.

  @Prop({ required: true })
  name: string

  @Prop({ required: true, index: true })
  phoneNumber: string

  @Prop()
  email?: string

  @Prop({ index: true })
  state?: string // Nigerian state

  @Prop({ index: true })
  lga?: string // Local Government Area

  @Prop()
  bustop?: string // Bus stop location

  @Prop({ default: 'active', index: true })
  status: string // 'active' | 'inactive' | 'suspended'

  @Prop()
  notes?: string // Admin notes about the agent

  createdAt?: Date
  updatedAt?: Date
}

export const AgentSchema = SchemaFactory.createForClass(Agent)
export type AgentDocument = Agent & Document

// Indexes
AgentSchema.index({ agentId: 1 })
AgentSchema.index({ phoneNumber: 1 })
AgentSchema.index({ status: 1 })
AgentSchema.index({ state: 1 })
AgentSchema.index({ lga: 1 })
