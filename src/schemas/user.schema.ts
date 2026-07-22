import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { BankAccount, BankAccountSchema } from "./bank-account.schema";

/** State of a single SmileID KYC check (bvn / nin / cac). */
export interface KycCheckState {
  status?: "pending" | "passed" | "failed";
  jobId?: string;
  checkedAt?: Date;
  attempts?: number;
  /** Why the check failed, surfaced to the merchant so they can correct it. */
  reason?: string;
  /**
   * Which SmileID product proved this check (enhanced_kyc / biometric_kyc /
   * kyb). A tier requiring a stronger product than the one on record reopens
   * the step — e.g. a LITE enhanced BVN does not satisfy PRO's biometric BVN.
   */
  product?: string;
}

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

  // ---- Merchant plans (LITE / PRO / PROMAX) ----

  // Tier the merchant has paid for. Absent = grandfathered/never upgraded.
  @Prop({ enum: ["LITE", "PRO", "PROMAX"], index: true })
  planTier?: string;

  @Prop({
    enum: ["none", "paid", "verifying", "verified", "failed"],
    default: "none",
  })
  planStatus?: string;

  // Achieved verification badge. LITE grants none, so this is PRO/PROMAX only.
  @Prop({ enum: ["PRO", "PROMAX"] })
  verificationLevel?: string;

  // Per-check SmileID KYC state. Drives resumability: the first required step
  // not yet satisfied is where the merchant picks back up. `product` records
  // how it was proven, so a stronger tier can reopen a weaker pass.
  @Prop({
    type: {
      bvn: { status: String, jobId: String, checkedAt: Date, attempts: Number, reason: String, product: String },
      nin: { status: String, jobId: String, checkedAt: Date, attempts: Number, reason: String, product: String },
      cac: { status: String, jobId: String, checkedAt: Date, attempts: Number, reason: String, product: String },
    },
    default: {},
  })
  kyc?: {
    bvn?: KycCheckState;
    nin?: KycCheckState;
    cac?: KycCheckState;
  };

  // Paystack billing refs for the recurring tiers
  @Prop()
  paystackCustomerCode?: string;

  @Prop({ type: [String], default: [] })
  subscriptionCodes?: string[];

  @Prop()
  planCurrentPeriodEnd?: Date;

  // Timestamps (automatically added by Mongoose)
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = User & Document;

// Indexes
// Standard indexes are handled by @Prop annotations.
// Custom composite indexes or options would go here.
