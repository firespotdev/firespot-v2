import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { BankAccount, BankAccountSchema } from "./bank-account.schema";

/** State of a single SmileID KYC check (bvn / nin / cac). */
export interface KycCheckState {
  status?: "pending" | "passed" | "failed";
  jobId?: string;
  checkedAt?: Date;
  /**
   * Set only after the hosted SmileID flow reports a successful submission.
   * A job id without this timestamp is a created/abandoned session, not a job
   * that should leave the merchant behind a permanent loading state.
   */
  submittedAt?: Date;
  attempts?: number;
  /** Why the check failed, surfaced to the merchant so they can correct it. */
  reason?: string;
  /**
   * Which SmileID product proved this check (enhanced_kyc / biometric_kyc /
   * kyb). A tier requiring a stronger product than the one on record reopens
   * the step — e.g. a LITE enhanced BVN does not satisfy PRO's biometric BVN.
   */
  product?: string;
  /**
   * The SmileID user_id this check's job ran under. Stored rather than
   * re-derived, because the id encodes the product and generation in force at
   * submission time — either can change before the job is polled.
   */
  smileUserId?: string;
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

  // ---- Shop setup ----

  @Prop()
  businessEmail?: string;

  @Prop()
  website?: string;

  @Prop({
    type: {
      instagram: String,
      facebook: String,
      whatsapp: String,
      tiktok: String,
      x: String,
    },
  })
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
    tiktok?: string;
    x?: string;
  };

  // How customers get goods/services. Any flag set counts the step complete.
  @Prop({
    type: {
      walkIn: Boolean,
      reservations: Boolean,
      homeService: Boolean,
      delivery: Boolean,
    },
  })
  fulfillment?: {
    walkIn?: boolean;
    reservations?: boolean;
    homeService?: boolean;
    delivery?: boolean;
  };

  // Primary business location. Branches are stored as a flat count for now and
  // are NOT materialised into Store docs, so they don't affect PRO MAX
  // per-store billing — that wiring is a later task.
  @Prop({
    type: {
      state: String,
      city: String,
      address: String,
      insideMarket: Boolean,
    },
  })
  mainAddress?: {
    state?: string;
    city?: string;
    address?: string;
    insideMarket?: boolean;
  };

  @Prop()
  branchCount?: number;

  // Employee setup is intentionally a persisted roster draft for now. It does
  // not grant authentication or merchant permissions until the staff-access
  // domain is implemented.
  @Prop({
    type: {
      employeeCount: Number,
      staff: [
        {
          name: String,
          phoneNumber: String,
          source: {
            type: String,
            enum: ["contacts"],
            default: "contacts",
          },
          _id: false,
        },
      ],
      configuredAt: Date,
    },
    _id: false,
  })
  employeeSetup?: {
    employeeCount: number;
    staff: Array<{
      name: string;
      phoneNumber: string;
      source: "contacts";
    }>;
    configuredAt: Date;
  };

  @Prop({
    type: {
      returns: Boolean,
      exchanges: Boolean,
      cancellations: Boolean,
      refunds: Boolean,
      configuredAt: Date,
    },
    _id: false,
  })
  shopPolicies?: {
    returns: boolean;
    exchanges: boolean;
    cancellations: boolean;
    refunds: boolean;
    configuredAt: Date;
  };

  @Prop({
    type: {
      openingHours: {
        useDifferentTimes: Boolean,
        timezone: String,
        days: [
          {
            day: String,
            enabled: Boolean,
            opensAt: String,
            closesAt: String,
            closesNextDay: Boolean,
            _id: false,
          },
        ],
        _id: false,
      },
      appointmentAndReservation: {
        bookingType: {
          type: String,
          enum: ["SPACE", "APPOINTMENT"],
        },
        bookableHours: {
          days: [
            {
              day: String,
              enabled: Boolean,
              opensAt: String,
              closesAt: String,
              closesNextDay: Boolean,
              _id: false,
            },
          ],
          _id: false,
        },
        capacity: {
          guestsAtOnce: Number,
          largestGroup: Number,
          customersAtOnce: Number,
          _id: false,
        },
        instantConfirmation: Boolean,
        freeCancellations: Boolean,
        deposit: {
          amount: Number,
          depositType: {
            type: String,
            enum: ["FIXED", "PERCENTAGE"],
          },
          _id: false,
        },
        freeCancellationHours: Number,
        _id: false,
      },
      configuredAt: Date,
    },
    _id: false,
  })
  activeHoursSetup?: {
    openingHours: {
      useDifferentTimes: boolean;
      timezone: string;
      days: Array<{
        day: string;
        enabled: boolean;
        opensAt?: string;
        closesAt?: string;
        closesNextDay: boolean;
      }>;
    };
    appointmentAndReservation: {
      bookingType: "SPACE" | "APPOINTMENT";
      bookableHours: {
        days: Array<{
          day: string;
          enabled: boolean;
          opensAt?: string;
          closesAt?: string;
          closesNextDay: boolean;
        }>;
      };
      capacity: {
        guestsAtOnce?: number;
        largestGroup?: number;
        customersAtOnce?: number;
      };
      instantConfirmation: boolean;
      freeCancellations: boolean;
      deposit: {
        amount: number;
        depositType: "FIXED" | "PERCENTAGE";
      };
      freeCancellationHours?: number;
    };
    configuredAt: Date;
  };

  // Set once the merchant taps "Go live and start selling".
  @Prop({ default: false })
  shopIsLive?: boolean;

  @Prop()
  shopWentLiveAt?: Date;

  // Merchant slug (6 alphanumeric characters, editable, for direct sharing)
  @Prop({ unique: true, sparse: true, index: true, length: 6 })
  merchantSlug?: string;

  @Prop({ unique: true, sparse: true, uppercase: true })
  merchantReferralCode?: string;

  // Bank accounts (array of bank accounts)
  @Prop({ type: [BankAccountSchema], default: [] })
  bankAccounts?: BankAccount[];

  // Editable fields
  @Prop()
  profilePhotoUrl?: string;

  @Prop()
  profilePhotoPublicId?: string;

  @Prop()
  profileBannerUrl?: string;

  @Prop()
  profileBannerPublicId?: string;

  // Referral - now links to Agent who referred this merchant
  @Prop({ type: Types.ObjectId, ref: "Agent" })
  referredByAgent?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  referredByMerchant?: Types.ObjectId;

  @Prop({ enum: ["agent", "merchant"] })
  referralSource?: "agent" | "merchant";

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

  /**
   * When the merchant first completed every KYC step for their tier. Durable:
   * unlike planStatus (which a lapse overwrites with "failed"), this is never
   * cleared — so a lapsed-but-verified merchant is still known to be verified.
   * Gates the ability to collect payments.
   */
  @Prop()
  kycCompletedAt?: Date;

  // Per-check SmileID KYC state. Drives resumability: the first required step
  // not yet satisfied is where the merchant picks back up. `product` records
  // how it was proven, so a stronger tier can reopen a weaker pass.
  @Prop({
    type: {
      bvn: { status: String, jobId: String, checkedAt: Date, submittedAt: Date, attempts: Number, reason: String, product: String, smileUserId: String },
      nin: { status: String, jobId: String, checkedAt: Date, submittedAt: Date, attempts: Number, reason: String, product: String, smileUserId: String },
      cac: { status: String, jobId: String, checkedAt: Date, submittedAt: Date, attempts: Number, reason: String, product: String, smileUserId: String },
    },
    default: {},
  })
  kyc?: {
    bvn?: KycCheckState;
    nin?: KycCheckState;
    cac?: KycCheckState;
  };

  /**
   * Salts the SmileID user_id. SmileID enrollments are permanent and there is
   * no API to clear them, so wiping our `kyc` records alone leaves the next
   * job colliding with the old enrollment (2209). Bumped only by the local
   * reset script — production merchants stay on generation 0, keeping their
   * SmileID identity stable.
   */
  @Prop({ default: 0 })
  kycGeneration?: number;

  // Paystack billing refs for the recurring tiers
  @Prop()
  paystackCustomerCode?: string;

  // Legacy: codes only. Kept readable so existing rows still resolve; new
  // subscriptions are written to `subscriptions` below.
  @Prop({ type: [String], default: [] })
  subscriptionCodes?: string[];

  /**
   * Paystack subscriptions. `emailToken` is an opaque token Paystack issues
   * per subscription (NOT an email address) and is required alongside the code
   * to disable it. Recoverable via GET /subscription/:code when missing.
   */
  @Prop({
    type: [
      {
        code: String,
        emailToken: String,
        planCode: String,
        interval: String,
        status: String,
        createdAt: Date,
      },
    ],
    default: [],
  })
  subscriptions?: Array<{
    code: string;
    emailToken?: string;
    planCode?: string;
    interval?: string;
    status?: string;
    createdAt?: Date;
  }>;

  // Set when a merchant cancels; access runs to planCurrentPeriodEnd.
  @Prop({ default: false })
  cancelAtPeriodEnd?: boolean;

  @Prop()
  planCurrentPeriodEnd?: Date;

  // Start of the current billing period. Needed so proration divides by the
  // real period length instead of assuming 30 days.
  @Prop()
  planCurrentPeriodStart?: Date;

  /**
   * Billing cadence currently in force. Source of truth: a deferred change
   * can land without creating a PlanOrder, so deriving this from order
   * history alone goes stale.
   */
  @Prop({ enum: ["monthly", "annually"] })
  planInterval?: string;

  /**
   * Paystack invoice the period was last renewed for. One renewal reaches us
   * several times — `invoice.payment_succeeded` and `invoice.update` both fire
   * for the same invoice, and Paystack retries delivery — so this is what
   * keeps extending the period idempotent.
   */
  @Prop()
  lastRenewalReference?: string;

  // Set when a subscription charge fails. Full access continues until this
  // moment, after which the merchant is demoted to the LITE floor.
  @Prop()
  planGraceUntil?: Date;

  /**
   * A downgrade scheduled for the end of the current period. Upgrades apply
   * immediately (prorated) and never land here.
   */
  @Prop({
    type: {
      tier: String,
      interval: String,
      effectiveAt: Date,
      planOrderId: Types.ObjectId,
    },
  })
  pendingPlanChange?: {
    tier: string;
    interval?: string;
    effectiveAt: Date;
    planOrderId?: Types.ObjectId;
  };

  /**
   * Paystack authorization token for the merchant's saved card (not card
   * data). Lets prorated upgrades be charged silently instead of bouncing
   * the merchant through checkout.
   */
  @Prop()
  paystackAuthorizationCode?: string;

  @Prop({
    type: {
      channel: String,
      brand: String,
      last4: String,
      bank: String,
      cardType: String,
      reusable: Boolean,
    },
    _id: false,
  })
  paystackAuthorizationDetails?: {
    channel?: string;
    brand?: string;
    last4?: string;
    bank?: string;
    cardType?: string;
    reusable?: boolean;
  };

  // Timestamps (automatically added by Mongoose)
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = User & Document;

// Indexes
// Standard indexes are handled by @Prop annotations.
// Custom composite indexes or options would go here.
