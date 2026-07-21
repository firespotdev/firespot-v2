import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { IsIn, IsNotEmpty, IsString } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { MerchantPlansService } from './merchant-plans.service'
import { PLAN_TIERS } from './constants/plans'

class PurchasePlanDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(PLAN_TIERS, { message: 'Invalid plan tier' })
  tier: string
}

@ApiTags('merchant-plans')
@Controller('merchant-plans')
export class MerchantPlansController {
  constructor(private readonly merchantPlansService: MerchantPlansService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Plan catalog + this merchant’s current plan state' })
  @ApiResponse({ status: 200, description: 'Catalog returned' })
  async getCatalog(@Request() req) {
    return this.merchantPlansService.getCatalog(req.user.userId)
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Start a plan purchase (returns Paystack URL)' })
  @ApiResponse({ status: 201, description: 'Payment initialized' })
  async purchase(@Request() req, @Body() dto: PurchasePlanDto) {
    return this.merchantPlansService.purchase(req.user.userId, dto.tier)
  }

  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify a plan payment and grant the tier' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verify(@Param('reference') reference: string) {
    return this.merchantPlansService.verifyPayment(reference)
  }
}
