import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Headers,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { SignupDto } from "./dto/signup.dto";

const REFRESH_COOKIE_NAME = "fs_refresh";
const REFRESH_COOKIE_PATH = "/api/v1/auth";
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private isProduction(): boolean {
    return this.configService.get<string>("NODE_ENV") === "production";
  }

  private setRefreshCookie(res: Response, token: string): void {
    const isProd = this.isProduction();
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_COOKIE_MAX_AGE,
      domain: this.configService.get<string>("COOKIE_DOMAIN") || undefined,
    });
  }

  private clearRefreshCookie(res: Response): void {
    const isProd = this.isProduction();
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: REFRESH_COOKIE_PATH,
      domain: this.configService.get<string>("COOKIE_DOMAIN") || undefined,
    });
  }

  @Post("request-otp")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: "Request OTP (unified login/signup)",
    description:
      "Sends an OTP to the phone number. Creates an account automatically if one does not exist. The response is the same for new and existing users. Rate limited per user (60s cooldown, 5/hour) and per IP.",
  })
  @ApiResponse({
    status: 200,
    description: "OTP sent successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "OTP sent successfully" },
        expiresIn: {
          type: "number",
          example: 600,
          description: "Expiry time in seconds",
        },
        cooldownSeconds: {
          type: "number",
          example: 60,
          description: "Cooldown period in seconds",
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid phone number format" })
  @ApiResponse({
    status: 429,
    description: "Rate limit exceeded or cooldown active",
  })
  @ApiResponse({
    status: 500,
    description: "Failed to send OTP (Termii service error)",
  })
  async requestOtp(@Body() requestOtpDto: RequestOtpDto) {
    return this.authService.requestOtp(requestOtpDto);
  }

  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Sign up",
    description:
      "Creates a new user account with bank details. Verifies bank account with Paystack and uses account name as business name. Sends OTP to phone number for verification.",
  })
  @ApiResponse({
    status: 201,
    description: "Account created successfully, OTP sent",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example:
            "Account created successfully. OTP sent to your phone number.",
        },
        expiresIn: {
          type: "number",
          example: 600,
          description: "Expiry time in seconds",
        },
        cooldownSeconds: {
          type: "number",
          example: 60,
          description: "Cooldown period in seconds",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Invalid input or user already exists or invalid referral code",
  })
  @ApiResponse({
    status: 500,
    description:
      "Failed to send OTP (Termii service error) or bank verification failed",
  })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post("customer/signup")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Customer Sign up",
    description: "Creates a new customer account using only phone number and triggers Termii OTP validation.",
  })
  async customerSignup(@Body() dto: RequestOtpDto) {
    return this.authService.customerSignup(dto.phoneNumber, dto.phoneCountryCode);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Login",
    description:
      "Sends an OTP code to an existing user's phone number via SMS using Termii. Only works for users who have already signed up. Rate limited to 5 requests per hour with a 60-second cooldown between requests.",
  })
  @ApiResponse({
    status: 200,
    description: "OTP sent successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "OTP sent successfully" },
        expiresIn: {
          type: "number",
          example: 600,
          description: "Expiry time in seconds",
        },
        cooldownSeconds: {
          type: "number",
          example: 60,
          description: "Cooldown period in seconds",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid phone number format",
  })
  @ApiResponse({
    status: 401,
    description: "User not found. Please sign up first.",
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit exceeded or cooldown active",
  })
  @ApiResponse({
    status: 500,
    description: "Failed to send OTP (Termii service error)",
  })
  async login(@Body() loginDto: RequestOtpDto) {
    return this.authService.login(loginDto);
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Verify OTP",
    description:
      "Verifies the OTP code sent to the user's phone number. Returns a JWT access token on successful verification.",
  })
  @ApiResponse({
    status: 200,
    description: "OTP verified successfully",
    schema: {
      type: "object",
      properties: {
        accessToken: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          description: "JWT access token for authenticated requests",
        },
        user: {
          type: "object",
          properties: {
            id: { type: "string" },
            phoneNumber: { type: "string", example: "8179542786" },
            fullPhoneNumber: { type: "string", example: "+2348179542786" },
            businessName: { type: "string", nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Invalid or expired OTP",
  })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Headers("user-agent") userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...result } = await this.authService.verifyOtp(
      verifyOtpDto,
      userAgent,
    );
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: "Refresh access token",
    description:
      "Exchanges the httpOnly refresh cookie for a new short-lived access token, rotating the refresh token.",
  })
  @ApiResponse({ status: 200, description: "New access token issued" })
  @ApiResponse({ status: 401, description: "Missing/invalid refresh token" })
  async refresh(
    @Req() req: Request,
    @Headers("user-agent") userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookie = req.cookies?.[REFRESH_COOKIE_NAME];
    const { refreshToken, ...result } = await this.authService.refresh(
      cookie,
      userAgent,
    );
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Logout",
    description:
      "Revokes the current refresh token and clears the refresh cookie.",
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
    this.clearRefreshCookie(res);
    return { success: true };
  }
}
