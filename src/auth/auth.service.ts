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
import axios from 'axios'
import { User } from '../schemas/user.schema'
import { Agent } from '../admin/schemas/agent.schema'
import { RequestOtpDto } from './dto/request-otp.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { SignupDto } from './dto/signup.dto'
import { PaystackService } from '../users/services/paystack.service'

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

    // Send OTP via Termii and get pin_id
    const pinId = await this.sendOtpSms(
      termiiPhoneNumber,
      otpExpiryMinutes,
      otpLength,
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

    // Send OTP via Termii and get pin_id
    const pinId = await this.sendOtpSms(
      termiiPhoneNumber,
      otpExpiryMinutes,
      otpLength,
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

    // Verify OTP with Termii
    const isValid = await this.verifyOtpWithTermii(
      user.otpPinId,
      otpCode,
      otpLength,
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

  private async sendOtpSms(
    phoneNumber: string,
    otpExpiryMinutes: number,
    otpLength: number,
  ): Promise<string> {
    // Check if mock mode is enabled
    const mockOtp =
      this.configService.get<string>('MOCK_OTP', 'false').toLowerCase() ===
      'true'

    if (mockOtp) {
      // Generate a fake pinId for mock mode
      const mockPinId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`
      console.log('🔧 MOCK MODE: OTP request (any 6-digit code will work):', {
        phoneNumber,
        pinId: mockPinId,
        message: `In mock mode, you can use any ${otpLength}-digit code to verify`,
      })
      return mockPinId
    }

    const termiiApiKey = this.configService.get<string>('TERMII_API_KEY')
    const termiiSenderId = this.configService.get<string>(
      'TERMII_SENDER_ID',
      'Firespot',
    )

    if (!termiiApiKey) {
      console.error('TERMII_API_KEY is not configured')
      throw new InternalServerErrorException(
        'SMS service is not configured. Please contact support.',
      )
    }

    // Generate placeholder based on OTP length (e.g., "< 123456 >" for 6 digits)
    const pinPlaceholder = `< ${'1'.repeat(otpLength)} >`

    try {
      const response = await axios.post(
        'https://api.ng.termii.com/api/sms/otp/send',
        {
          api_key: termiiApiKey,
          pin_type: 'NUMERIC',
          to: phoneNumber,
          //from: termiiSenderId,
          from: 'N-Alert',
          //channel: 'generic',
          channel: 'dnd',
          pin_attempts: 1,
          pin_time_to_live: otpExpiryMinutes,
          pin_length: otpLength,
          pin_placeholder: pinPlaceholder,
          message_text: `Your Firespot OTP is ${pinPlaceholder}. Valid for ${otpExpiryMinutes} minutes. Do not share this code with anyone.`,
        },
      )

      const pinId = response.data.pinId || response.data.pin_id

      if (!pinId) {
        console.error('Termii did not return a pin_id:', response.data)
        throw new InternalServerErrorException(
          'Failed to generate OTP. Please try again.',
        )
      }

      console.log('OTP sent successfully via Termii:', {
        phoneNumber,
        pinId,
      })

      return pinId
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Termii API error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        })

        // Handle specific Termii errors
        if (error.response?.status === 401) {
          throw new InternalServerErrorException(
            'SMS service authentication failed. Please contact support.',
          )
        }

        if (error.response?.status === 400) {
          throw new BadRequestException(
            'Invalid phone number format. Please check and try again.',
          )
        }

        throw new InternalServerErrorException(
          'Failed to send OTP. Please try again later.',
        )
      }

      throw error
    }
  }

  private async verifyOtpWithTermii(
    pinId: string,
    pin: string,
    otpLength: number = 6,
  ): Promise<boolean> {
    // Check if mock mode is enabled
    const mockOtp =
      this.configService.get<string>('MOCK_OTP', 'false').toLowerCase() ===
      'true'

    if (mockOtp) {
      // In mock mode, accept any code with the configured OTP length
      const otpRegex = new RegExp(`^\\d{${otpLength}}$`)
      const isValid = otpRegex.test(pin)
      if (isValid) {
        console.log(`🔧 MOCK MODE: OTP verified successfully:`, {
          pinId,
          pin,
          message: `Mock mode - any ${otpLength}-digit code is accepted`,
        })
        return true
      } else {
        console.log(
          `🔧 MOCK MODE: Invalid OTP format (must be ${otpLength} digits):`,
          {
            pinId,
            pin,
          },
        )
        return false
      }
    }

    const termiiApiKey = this.configService.get<string>('TERMII_API_KEY')

    if (!termiiApiKey) {
      console.error('TERMII_API_KEY is not configured')
      throw new InternalServerErrorException(
        'SMS service is not configured. Please contact support.',
      )
    }

    try {
      const response = await axios.post(
        'https://api.ng.termii.com/api/sms/otp/verify',
        {
          api_key: termiiApiKey,
          pin_id: pinId,
          pin: pin,
        },
      )

      const isVerified =
        response.data.verified === 'True' || response.data.verified === true

      console.log('OTP verification result:', {
        pinId,
        verified: isVerified,
        phoneNumber: response.data.msisdn,
      })

      return isVerified
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Termii OTP verification error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        })

        // Handle specific verification errors
        if (error.response?.status === 400) {
          // Invalid pin_id or expired OTP
          return false
        }

        if (error.response?.status === 401) {
          throw new InternalServerErrorException(
            'SMS service authentication failed. Please contact support.',
          )
        }

        throw new InternalServerErrorException(
          'Failed to verify OTP. Please try again later.',
        )
      }

      throw error
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
