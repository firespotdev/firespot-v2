import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class Admin extends Document {
  @Prop({ required: true, unique: true, index: true })
  adminId: string; // Format: "ADM-001", "ADM-002", etc.

  @Prop({ required: true })
  password: string; // Hashed with bcrypt

  @Prop({ required: true })
  name: string;

  @Prop({ default: "admin" })
  role: string; // 'admin'

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLoginAt?: Date;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
export type AdminDocument = Admin & Document;

// Indexes
AdminSchema.index({ adminId: 1 });
