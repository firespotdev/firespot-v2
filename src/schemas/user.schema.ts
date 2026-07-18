import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { BankAccount, BankAccountSchema } from "./bank-account.schema";

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, index: true })
  phoneNumber: string;

  @Prop({ required: true, enum: ["merchant", "customer"], default: "merchant", index: true })
  role: string;

  @Prop({ required: true, default: "+234" })
  phoneCountryCode: string;

  @Prop({ required: true, unique: true })
  fullPhoneNumber: string;

  // OTP fields
  @Prop()
  otpCode?: string;

  @Prop()
  otpExpiresAt?: Date;

  @Prop()
  otpPinId?: string; // Termii pin_id for OTP verification

  // Rate limiting for OTP requests
  @Prop({ default: 0 })
  otpRequestCount?: number; // Number of OTP requests in the current window

  @Prop()
  otpRequestWindowStart?: Date; // Start of the current rate limit window

  @Prop()
  lastOtpRequestAt?: Date; // Timestamp of the last OTP request (for cooldown)

  @Prop({ default: 0 })
  otpFailedAttempts?: number; // Consecutive failed OTP verifications

  @Prop()
  otpLockedUntil?: Date; // Verification locked until this time after too many failures

  // Personal profile
  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  // True once the user has completed post-signup onboarding (name entry).
  // Existing users are marked true via migration.
  @Prop({ default: false })
  onboardingCompleted: boolean;

  // Merchant info
  @Prop()
  businessName?: string;

  @Prop()
  businessIndustry?: string;

  @Prop({ maxlength: 160 })
  businessDescription?: string;

  // Merchant slug (6 alphanumeric characters, editable, for direct sharing)
  @Prop({ unique: true, sparse: true, index: true, length: 6 })
  merchantSlug?: string;

  // Bank accounts (array of bank accounts)
  @Prop({ type: [BankAccountSchema], default: [] })
  bankAccounts?: BankAccount[];

  // Editable fields
  @Prop()
  profilePhotoUrl?: string;

  @Prop()
  profilePhotoPublicId?: string;

  // Referral - now links to Agent who referred this merchant
  @Prop({ type: Types.ObjectId, ref: "Agent" })
  referredByAgent?: Types.ObjectId;

  @Prop({ default: 0 })
  availableKitEntitlements?: number;

  @Prop()
  lastLoginAt?: Date;

  @Prop({ type: [String], default: [] })
  fcmTokens?: string[];

  // Merchants this user has saved to their Faves (personal activity feature)
  @Prop({ type: [{ type: Types.ObjectId, ref: "User" }], default: [] })
  favoriteMerchants?: Types.ObjectId[];

  // Pre-created by a merchant recording a sale before this person has ever
  // logged in. The real owner claims it on their first OTP verification, at
  // which point isPlaceholder is cleared.
  @Prop({ default: false, index: true })
  isPlaceholder?: boolean;

  @Prop()
  placeholderCreatedAt?: Date;

  // Timestamps (automatically added by Mongoose)
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = User & Document;

// Indexes
// Standard indexes are handled by @Prop annotations.
// Custom composite indexes or options would go here.
