import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  Request,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { KycService } from './kyc.service'
import { SmileIdService } from '../services/smileid/smileid.service'
import type { KycCheck } from '../merchant-plans/constants/plans'

class VerifyCacDto {
  @IsString()
  @IsNotEmpty()
  rcNumber: string

  @IsString()
  @IsOptional()
  businessType?: string
}

class MarkKycSessionSubmittedDto {
  @IsString()
  @IsNotEmpty()
  jobId: string
}

@ApiTags('kyc')
@Controller('kyc')
export class KycController {
  constructor(
    private readonly kycService: KycService,
    private readonly smileIdService: SmileIdService,
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Verification status + nextCheck (drives resumable KYC)',
  })
  @ApiResponse({ status: 200, description: 'Status returned' })
  async getStatus(@Request() req) {
    return this.kycService.getStatus(req.user.userId)
  }

  @Post('session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mint a SmileID Web SDK token for the next check' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(@Request() req) {
    return this.kycService.createSession(req.user.userId)
  }

  @Post('session/submitted')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark a hosted SmileID session as submitted' })
  async markSessionSubmitted(
    @Request() req,
    @Body() dto: MarkKycSessionSubmittedDto,
  ) {
    return this.kycService.markSessionSubmitted(req.user.userId, dto.jobId)
  }

  @Post('cac')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify CAC/RC number (Business Verification)' })
  async verifyCac(@Request() req, @Body() dto: VerifyCacDto) {
    return this.kycService.verifyCac(req.user.userId, dto)
  }

  @Post('reconcile/:check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Re-poll SmileID for a check whose callback was missed',
  })
  async reconcile(@Request() req, @Param('check') check: string) {
    return this.kycService.reconcile(req.user.userId, check as KycCheck)
  }

  /**
   * Public SmileID callback. Signature-verified; SmileID sends the signature
   * and timestamp in the body of the job result.
   *
   * Both paths are registered so an existing SMILEID_CALLBACK_URL pointing at
   * /kyc/callback keeps working alongside the namespaced form.
   */
  @Post(['callback', 'smileid/callback'])
  @ApiOperation({ summary: 'SmileID async job result callback' })
  @ApiResponse({ status: 201, description: 'Callback received' })
  async callback(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    const signature = payload?.signature || headers['x-smile-signature']
    const timestamp = payload?.timestamp || headers['x-smile-timestamp']

    if (
      signature &&
      timestamp &&
      !this.smileIdService.confirmSignature(timestamp, signature)
    ) {
      // Do not throw — SmileID retries on non-2xx. Log and drop.
      return { received: true, verified: false }
    }

    return this.kycService.handleCallback(payload)
  }
}
