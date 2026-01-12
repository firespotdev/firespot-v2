import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { RequestOtpDto } from './dto/request-otp.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { SignupDto } from './dto/signup.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Sign up',
    description:
      'Creates a new user account with bank details. Verifies bank account with Paystack and uses account name as business name. Sends OTP to phone number for verification.',
  })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully, OTP sent',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example:
            'Account created successfully. OTP sent to your phone number.',
        },
        expiresIn: {
          type: 'number',
          example: 600,
          description: 'Expiry time in seconds',
        },
        cooldownSeconds: {
          type: 'number',
          example: 60,
          description: 'Cooldown period in seconds',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input or user already exists or invalid referral code',
  })
  @ApiResponse({
    status: 500,
    description:
      'Failed to send OTP (Termii service error) or bank verification failed',
  })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description:
      "Sends an OTP code to an existing user's phone number via SMS using Termii. Only works for users who have already signed up. Rate limited to 5 requests per hour with a 60-second cooldown between requests.",
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'OTP sent successfully' },
        expiresIn: {
          type: 'number',
          example: 600,
          description: 'Expiry time in seconds',
        },
        cooldownSeconds: {
          type: 'number',
          example: 60,
          description: 'Cooldown period in seconds',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid phone number format',
  })
  @ApiResponse({
    status: 401,
    description: 'User not found. Please sign up first.',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded or cooldown active',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to send OTP (Termii service error)',
  })
  async login(@Body() loginDto: RequestOtpDto) {
    return this.authService.login(loginDto)
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP',
    description:
      "Verifies the OTP code sent to the user's phone number. Returns a JWT access token on successful verification.",
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'JWT access token for authenticated requests',
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            phoneNumber: { type: 'string', example: '8179542786' },
            fullPhoneNumber: { type: 'string', example: '+2348179542786' },
            businessName: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired OTP',
  })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto)
  }
}
