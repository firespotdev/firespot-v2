import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { customAlphabet } from "nanoid";
import { createHash, randomBytes } from "crypto";
import {
  RefreshToken,
  RefreshTokenDocument,
} from "../schemas/refresh-token.schema";

const nanoidAlphanumeric = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
);
import { User } from "../schemas/user.schema";
import { Agent } from "../admin/schemas/agent.schema";
import { normalizeNigerianPhone } from "../common/phone";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { SignupDto } from "./dto/signup.dto";
import { PaystackService } from "../users/services/paystack.service";
import { SmsService } from "../services/sms/sms.service";

// Rate limiting constants
const OTP_RATE_LIMIT_WINDOW_MINUTES = 60; // 1 hour window
const OTP_MAX_REQUESTS_PER_WINDOW = 5; // Max 5 OTP requests per hour
const OTP_COOLDOWN_SECONDS = 60; // 60 seconds between OTP requests
const OTP_MAX_FAILED_ATTEMPTS = 5; // Failed verifications before lockout
const OTP_LOCKOUT_MINUTES = 15; // Verification lockout duration
const REFRESH_TOKEN_TTL_DAYS = 30; // Refresh cookie lifetime

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Agent.name) private agentModel: Model<Agent>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private paystackService: PaystackService,
    private smsService: SmsService,
  ) {}

  /**
   * Unified entry point: sends an OTP to the phone number, creating a bare
   * customer account first if none exists. The response is identical for new
   * and existing users so phone numbers cannot be enumerated.
   */
  async requestOtp(requestOtpDto: RequestOtpDto) {
    const { phoneNumber, phoneCountryCode } = requestOtpDto;
    const normalizedPhone = this.normalizePhoneNumber(
      phoneNumber,
      phoneCountryCode,
    );
    const fullPhoneNumber = `${phoneCountryCode}${normalizedPhone}`;

    let user = await this.userModel.findOne({ phoneNumber: normalizedPhone });

    if (!user) {
      user = await this.userModel.create({
        phoneNumber: normalizedPhone,
        phoneCountryCode,
        fullPhoneNumber,
        role: "customer",
        onboardingCompleted: false,
      });
    }

    return this.sendOtpToUser(user, phoneCountryCode, normalizedPhone);
  }

  /**
   * @deprecated Use requestOtp instead. Kept for older clients.
   */
  async login(loginDto: RequestOtpDto) {
    const { phoneNumber, phoneCountryCode } = loginDto;
    const normalizedPhone = this.normalizePhoneNumber(
      phoneNumber,
      phoneCountryCode,
    );

    const user = await this.userModel.findOne({ phoneNumber: normalizedPhone });

    if (!user) {
      throw new UnauthorizedException("User not found. Please sign up first.");
    }

    return this.sendOtpToUser(user, phoneCountryCode, normalizedPhone);
  }

  /**
   * Applies rate limits, sends the OTP via SMS, and updates the user's OTP
   * bookkeeping fields. Shared by requestOtp and the legacy login flow.
   */
  private async sendOtpToUser(
    user: User,
    phoneCountryCode: string,
    normalizedPhone: string,
  ) {
    // Apply rate limiting and cooldown
    this.checkRateLimits(user);

    const fullPhoneNumber = `${phoneCountryCode}${normalizedPhone}`;
    const termiiPhoneNumber = fullPhoneNumber.replace("+", "");

    const otpExpiryMinutes = this.configService.get<number>(
      "OTP_EXPIRY_MINUTES",
      10,
    );
    const otpLength = this.configService.get<number>("OTP_LENGTH", 6);

    // Send OTP via SmsService and get pin_id
    const pinId = await this.smsService.sendOtp(
      termiiPhoneNumber,
      otpExpiryMinutes,
      otpLength,
      `Your Firespot OTP is {{pin}}. Valid for ${otpExpiryMinutes} minutes. Do not share this code with anyone.`,
    );

    // Calculate expiry time
    const otpExpiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000);
    const now = new Date();

    // Update rate limiting counters
    const windowStart = user.otpRequestWindowStart;
    const windowExpired =
      !windowStart ||
      now.getTime() - windowStart.getTime() >
        OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

    if (windowExpired) {
      // Reset the window
      user.otpRequestCount = 1;
      user.otpRequestWindowStart = now;
    } else {
      // Increment counter within window
      user.otpRequestCount = (user.otpRequestCount || 0) + 1;
    }

    // Update OTP fields
    user.otpPinId = pinId;
    user.otpExpiresAt = otpExpiresAt;
    user.fullPhoneNumber = fullPhoneNumber;
    user.phoneCountryCode = phoneCountryCode;
    user.lastOtpRequestAt = now;
    user.otpFailedAttempts = 0;
    await user.save();

    return {
      success: true,
      message: "OTP sent successfully",
      expiresIn: otpExpiryMinutes * 60,
      cooldownSeconds: OTP_COOLDOWN_SECONDS,
    };
  }

  async signup(signupDto: SignupDto) {
    const {
      phoneNumber,
      phoneCountryCode,
      bankName,
      bankCode,
      accountNumber,
      referralCode,
    } = signupDto;

    const normalizedPhone = this.normalizePhoneNumber(
      phoneNumber,
      phoneCountryCode,
    );

    const existingUser = await this.userModel.findOne({
      phoneNumber: normalizedPhone,
    });
    if (existingUser) {
      throw new BadRequestException(
        "User already exists. Please login instead.",
      );
    }

    // Verify bank account with Paystack
    const verification = await this.paystackService.verifyBankAccount(
      accountNumber,
      bankCode,
    );

    const businessName = verification.accountName;

    // Look up agent by referral code (agents have referral codes, not users)
    let referringAgent: Agent | null = null;
    if (referralCode) {
      referringAgent = await this.agentModel.findOne({
        referralCode: referralCode.toUpperCase(),
      });

      if (!referringAgent) {
        throw new BadRequestException("Invalid referral code");
      }
    }

    const fullPhoneNumber = `${phoneCountryCode}${normalizedPhone}`;
    const termiiPhoneNumber = fullPhoneNumber.replace("+", "");

    const otpExpiryMinutes = this.configService.get<number>(
      "OTP_EXPIRY_MINUTES",
      10,
    );
    const otpLength = this.configService.get<number>("OTP_LENGTH", 6);

    // Send OTP via SmsService and get pin_id
    const pinId = await this.smsService.sendOtp(
      termiiPhoneNumber,
      otpExpiryMinutes,
      otpLength,
      `Your Firespot OTP is {{pin}}. Valid for ${otpExpiryMinutes} minutes. Do not share this code with anyone.`,
    );

    // Calculate expiry time
    const otpExpiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000);
    const now = new Date();

    // Generate unique merchant slug (6 alphanumeric characters)
    let merchantSlug: string;
    let isUnique = false;
    while (!isUnique) {
      merchantSlug = nanoidAlphanumeric(6);
      const existingSlug = await this.userModel.findOne({ merchantSlug });
      if (!existingSlug) {
        isUnique = true;
      }
    }

    // Create new user with all profile details
    // Store bank account in bankAccounts array (first account is primary)
    const user = await this.userModel.create({
      phoneNumber: normalizedPhone,
      phoneCountryCode,
      fullPhoneNumber,
      businessName,
      merchantSlug,
      bankAccounts: [
        {
          bankName,
          bankCode,
          accountNumber,
          accountName: verification.accountName,
          isPrimary: true,
        },
      ],
      otpPinId: pinId,
      otpExpiresAt,
      otpRequestCount: 1,
      otpRequestWindowStart: now,
      lastOtpRequestAt: now,
      referredByAgent: referringAgent?._id,
    });

    return {
      success: true,
      message: "Account created successfully. OTP sent to your phone number.",
      expiresIn: otpExpiryMinutes * 60,
      cooldownSeconds: OTP_COOLDOWN_SECONDS,
    };
  }

  async customerSignup(phoneNumber: string, phoneCountryCode: string) {
    const normalizedPhone = this.normalizePhoneNumber(
      phoneNumber,
      phoneCountryCode,
    );

    const existingUser = await this.userModel.findOne({
      phoneNumber: normalizedPhone,
    });
    if (existingUser) {
      throw new BadRequestException(
        "User already exists. Please login instead.",
      );
    }

    const fullPhoneNumber = `${phoneCountryCode}${normalizedPhone}`;
    const termiiPhoneNumber = fullPhoneNumber.replace("+", "");

    const otpExpiryMinutes = this.configService.get<number>(
      "OTP_EXPIRY_MINUTES",
      10,
    );
    const otpLength = this.configService.get<number>("OTP_LENGTH", 6);

    const pinId = await this.smsService.sendOtp(
      termiiPhoneNumber,
      otpExpiryMinutes,
      otpLength,
      `Your Firespot OTP is {{pin}}. Valid for ${otpExpiryMinutes} minutes. Do not share this code with anyone.`,
    );

    const otpExpiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000);
    const now = new Date();

    const user = await this.userModel.create({
      phoneNumber: normalizedPhone,
      phoneCountryCode,
      fullPhoneNumber,
      role: "customer",
      otpPinId: pinId,
      otpExpiresAt,
      otpRequestCount: 1,
      otpRequestWindowStart: now,
      lastOtpRequestAt: now,
    });

    return {
      success: true,
      message: "Account created successfully. OTP sent to your phone number.",
      expiresIn: otpExpiryMinutes * 60,
      cooldownSeconds: OTP_COOLDOWN_SECONDS,
    };
  }

  /**
   * Check rate limits and cooldown for OTP requests
   */
  private checkRateLimits(user: User): void {
    const now = new Date();

    if (user.lastOtpRequestAt) {
      const secondsSinceLastRequest = Math.floor(
        (now.getTime() - user.lastOtpRequestAt.getTime()) / 1000,
      );

      if (secondsSinceLastRequest < OTP_COOLDOWN_SECONDS) {
        const waitTime = OTP_COOLDOWN_SECONDS - secondsSinceLastRequest;
        throw new HttpException(
          `Please wait ${waitTime} seconds before requesting another OTP`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Check rate limit (max requests per window)
    if (user.otpRequestWindowStart && user.otpRequestCount) {
      const windowExpired =
        now.getTime() - user.otpRequestWindowStart.getTime() >
        OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

      if (
        !windowExpired &&
        user.otpRequestCount >= OTP_MAX_REQUESTS_PER_WINDOW
      ) {
        const windowResetTime = new Date(
          user.otpRequestWindowStart.getTime() +
            OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
        );
        const minutesUntilReset = Math.ceil(
          (windowResetTime.getTime() - now.getTime()) / (60 * 1000),
        );

        throw new HttpException(
          `Too many OTP requests. Please try again in ${minutesUntilReset} minutes`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto, userAgent?: string) {
    const { phoneNumber, otpCode } = verifyOtpDto;
    const phoneCountryCode = verifyOtpDto.phoneCountryCode || "+234";
    const normalizedPhone = this.normalizePhoneNumber(
      phoneNumber,
      phoneCountryCode,
    );

    const user = await this.userModel.findOne({ phoneNumber: normalizedPhone });

    if (!user || !user.otpPinId || !user.otpExpiresAt) {
      throw new UnauthorizedException("Invalid OTP request");
    }

    const now = new Date();

    // Reject while locked out from too many failed attempts
    if (user.otpLockedUntil && now < user.otpLockedUntil) {
      const minutesLeft = Math.ceil(
        (user.otpLockedUntil.getTime() - now.getTime()) / (60 * 1000),
      );
      throw new HttpException(
        `Too many failed attempts. Please try again in ${minutesLeft} minute(s)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (now > user.otpExpiresAt) {
      throw new UnauthorizedException("OTP has expired");
    }

    // Verify OTP via SmsService
    const isValid = await this.smsService.verifyOtp(user.otpPinId, otpCode);

    if (!isValid) {
      user.otpFailedAttempts = (user.otpFailedAttempts || 0) + 1;
      if (user.otpFailedAttempts >= OTP_MAX_FAILED_ATTEMPTS) {
        user.otpLockedUntil = new Date(
          now.getTime() + OTP_LOCKOUT_MINUTES * 60 * 1000,
        );
        user.otpFailedAttempts = 0;
      }
      await user.save();
      throw new UnauthorizedException("Invalid OTP");
    }

    const isNewUser = !user.lastLoginAt;

    // Clear OTP after successful verification
    user.otpPinId = undefined;
    user.otpExpiresAt = undefined;
    user.otpFailedAttempts = 0;
    user.otpLockedUntil = undefined;
    user.lastLoginAt = now;
    // The real owner has now proven control of this number, so a placeholder
    // account pre-created by a merchant is claimed.
    if (user.isPlaceholder) {
      user.isPlaceholder = false;
    }
    await user.save();

    // Issue a short-lived access token + rotated refresh token
    const { accessToken, refreshToken } = await this.issueTokens(
      user,
      userAgent,
    );

    return {
      accessToken,
      refreshToken,
      isNewUser,
      onboardingCompleted: user.onboardingCompleted === true,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        fullPhoneNumber: user.fullPhoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        role: (user as any).role || "merchant",
      },
    };
  }

  /**
   * Normalize phone number by removing leading zero for Nigerian numbers
   */
  private normalizePhoneNumber(phone: string, countryCode: string): string {
    return normalizeNigerianPhone(phone, countryCode);
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return user;
  }

  // ---- Token issuance / rotation ----

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private signAccessToken(user: User): string {
    return this.jwtService.sign({
      sub: user._id,
      phoneNumber: user.phoneNumber,
      type: "access",
    });
  }

  /**
   * Issues a short-lived access token plus an opaque refresh token. The
   * refresh token is stored only as a hash (rotated on every use).
   */
  private async issueTokens(
    user: User,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = randomBytes(48).toString("hex");

    await this.refreshTokenModel.create({
      tokenHash: this.hashToken(refreshToken),
      userId: user._id,
      expiresAt: new Date(
        Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      ),
      userAgent,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Validates the refresh token, rotates it (deletes the old, issues a new
   * one), and returns a fresh access token. Reuse of a rotated/unknown token
   * is rejected.
   */
  async refresh(refreshToken: string | undefined, userAgent?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokenModel.findOne({ tokenHash });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await stored.deleteOne();
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.userModel.findById(stored.userId);
    if (!user) {
      await stored.deleteOne();
      throw new UnauthorizedException("User not found");
    }

    // Rotate: invalidate the used token, issue a new pair
    await stored.deleteOne();
    const tokens = await this.issueTokens(user, userAgent);

    return {
      ...tokens,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        fullPhoneNumber: user.fullPhoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        role: (user as any).role || "merchant",
      },
      onboardingCompleted: user.onboardingCompleted === true,
    };
  }

  /**
   * Revokes a single refresh token (logout on this device). Idempotent.
   */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.refreshTokenModel.deleteOne({
      tokenHash: this.hashToken(refreshToken),
    });
  }
}
