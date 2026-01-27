import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { customAlphabet } from 'nanoid'

const nanoidAlphanumeric = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
import { User } from '../schemas/user.schema'
import { Agent } from '../admin/schemas/agent.schema'
import { RequestOtpDto } from './dto/request-otp.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { SignupDto } from './dto/signup.dto'
import { PaystackService } from '../users/services/paystack.service'
import { SmsService } from '../services/sms/sms.service'

// Rate limiting constants
const OTP_RATE_LIMIT_WINDOW_MINUTES = 60 // 1 hour window
const OTP_MAX_REQUESTS_PER_WINDOW = 5 // Max 5 OTP requests per hour
const OTP_COOLDOWN_SECONDS = 60 // 60 seconds between OTP requests

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Agent.name) private agentModel: Model<Agent>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private paystackService: PaystackService,
    private smsService: SmsService,
  ) {}

  async login(loginDto: RequestOtpDto) {
    const { phoneNumber, phoneCountryCode } = loginDto
    const fullPhoneNumber = `${phoneCountryCode}${phoneNumber}`

    const user = await this.userModel.findOne({ phoneNumber })

    if (!user) {
      throw new UnauthorizedException('User not found. Please sign up first.')
    }

    // Apply rate limiting and cooldown
    this.checkRateLimits(user)

    const termiiPhoneNumber = fullPhoneNumber.replace('+', '')

    const otpExpiryMinutes = this.configService.get<number>(
      'OTP_EXPIRY_MINUTES',
      10,
    )
    const otpLength = this.configService.get<number>('OTP_LENGTH', 6)

    // Send OTP via SmsService and get pin_id
    const pinId = await this.smsService.sendOtp(
      termiiPhoneNumber,
      otpExpiryMinutes,
      otpLength,
      `Your Firespot OTP is {{pin}}. Valid for ${otpExpiryMinutes} minutes. Do not share this code with anyone.`,
    )

    // Calculate expiry time
    const otpExpiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000)
    const now = new Date()

    // Update rate limiting counters
    const windowStart = user.otpRequestWindowStart
    const windowExpired =
      !windowStart ||
      now.getTime() - windowStart.getTime() >
        OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000

    if (windowExpired) {
      // Reset the window
      user.otpRequestCount = 1
      user.otpRequestWindowStart = now
    } else {
      // Increment counter within window
      user.otpRequestCount = (user.otpRequestCount || 0) + 1
    }

    // Update OTP fields
    user.otpPinId = pinId
    user.otpExpiresAt = otpExpiresAt
    user.fullPhoneNumber = fullPhoneNumber
    user.phoneCountryCode = phoneCountryCode
    user.lastOtpRequestAt = now
    await user.save()

    return {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: otpExpiryMinutes * 60,
      cooldownSeconds: OTP_COOLDOWN_SECONDS,
    }
  }

  async signup(signupDto: SignupDto) {
    const {
      phoneNumber,
      phoneCountryCode,
      bankName,
      bankCode,
      accountNumber,
      referralCode,
    } = signupDto

    const existingUser = await this.userModel.findOne({ phoneNumber })
    if (existingUser) {
      throw new BadRequestException(
        'User already exists. Please login instead.',
      )
    }

    // Verify bank account with Paystack
    const verification = await this.paystackService.verifyBankAccount(
      accountNumber,
      bankCode,
    )

    const businessName = verification.accountName

    // Look up agent by referral code (agents have referral codes, not users)
    let referringAgent: Agent | null = null
    if (referralCode) {
      referringAgent = await this.agentModel.findOne({
        referralCode: referralCode.toUpperCase(),
      })

      if (!referringAgent) {
        throw new BadRequestException('Invalid referral code')
      }
    }

    const fullPhoneNumber = `${phoneCountryCode}${phoneNumber}`
    const termiiPhoneNumber = fullPhoneNumber.replace('+', '')

    const otpExpiryMinutes = this.configService.get<number>(
      'OTP_EXPIRY_MINUTES',
      10,
    )
    const otpLength = this.configService.get<number>('OTP_LENGTH', 6)

    // Send OTP via SmsService and get pin_id
    const pinId = await this.smsService.sendOtp(
      termiiPhoneNumber,
      otpExpiryMinutes,
      otpLength,
      `Your Firespot OTP is {{pin}}. Valid for ${otpExpiryMinutes} minutes. Do not share this code with anyone.`,
    )

    // Calculate expiry time
    const otpExpiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000)
    const now = new Date()

    // Generate unique merchant slug (6 alphanumeric characters)
    let merchantSlug: string
    let isUnique = false
    while (!isUnique) {
      merchantSlug = nanoidAlphanumeric(6)
      const existingSlug = await this.userModel.findOne({ merchantSlug })
      if (!existingSlug) {
        isUnique = true
      }
    }

    // Create new user with all profile details
    // Store bank account in bankAccounts array (first account is primary)
    const user = await this.userModel.create({
      phoneNumber,
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
    })

    return {
      success: true,
      message: 'Account created successfully. OTP sent to your phone number.',
      expiresIn: otpExpiryMinutes * 60,
      cooldownSeconds: OTP_COOLDOWN_SECONDS,
    }
  }

  /**
   * Check rate limits and cooldown for OTP requests
   */
  private checkRateLimits(user: User): void {
    const now = new Date()

    if (user.lastOtpRequestAt) {
      const secondsSinceLastRequest = Math.floor(
        (now.getTime() - user.lastOtpRequestAt.getTime()) / 1000,
      )

      if (secondsSinceLastRequest < OTP_COOLDOWN_SECONDS) {
        const waitTime = OTP_COOLDOWN_SECONDS - secondsSinceLastRequest
        throw new HttpException(
          `Please wait ${waitTime} seconds before requesting another OTP`,
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }
    }

    // Check rate limit (max requests per window)
    if (user.otpRequestWindowStart && user.otpRequestCount) {
      const windowExpired =
        now.getTime() - user.otpRequestWindowStart.getTime() >
        OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000

      if (
        !windowExpired &&
        user.otpRequestCount >= OTP_MAX_REQUESTS_PER_WINDOW
      ) {
        const windowResetTime = new Date(
          user.otpRequestWindowStart.getTime() +
            OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
        )
        const minutesUntilReset = Math.ceil(
          (windowResetTime.getTime() - now.getTime()) / (60 * 1000),
        )

        throw new HttpException(
          `Too many OTP requests. Please try again in ${minutesUntilReset} minutes`,
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }
    }
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { phoneNumber, otpCode } = verifyOtpDto

    const user = await this.userModel.findOne({ phoneNumber })

    if (!user || !user.otpPinId || !user.otpExpiresAt) {
      throw new UnauthorizedException('Invalid OTP request')
    }

    if (new Date() > user.otpExpiresAt) {
      throw new UnauthorizedException('OTP has expired')
    }

    // Get OTP length from config for mock mode validation
    const otpLength = this.configService.get<number>('OTP_LENGTH', 6)

    // Verify OTP via SmsService
    const isValid = await this.smsService.verifyOtp(
      user.otpPinId,
      otpCode,
    )

    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP')
    }

    // Clear OTP after successful verification
    user.otpPinId = undefined
    user.otpExpiresAt = undefined
    user.lastLoginAt = new Date()
    await user.save()

    // Generate JWT token
    const payload = { sub: user._id, phoneNumber: user.phoneNumber }
    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        fullPhoneNumber: user.fullPhoneNumber,
        businessName: user.businessName,
      },
    }
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    return user
  }
}
