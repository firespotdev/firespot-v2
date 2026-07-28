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
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { MerchantPlansService } from './merchant-plans.service'
import {
  PLAN_PAYMENT_METHODS,
  PLAN_TIERS,
  type PlanPaymentMethod,
} from './constants/plans'

class PurchasePlanDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(PLAN_TIERS, { message: 'Invalid plan tier' })
  tier: string

  @IsOptional()
  @IsIn(['monthly', 'annually'], { message: 'Invalid billing interval' })
  interval?: 'monthly' | 'annually'

  @IsOptional()
  @IsIn(PLAN_PAYMENT_METHODS, { message: 'Invalid payment method' })
  paymentMethod?: PlanPaymentMethod
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

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Payment methods available for plan checkout' })
  @ApiResponse({ status: 200, description: 'Payment methods returned' })
  async getPaymentMethods(@Request() req) {
    return this.merchantPlansService.getPaymentMethods(req.user.userId)
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Start a plan purchase (returns Paystack URL)' })
  @ApiResponse({ status: 201, description: 'Payment initialized' })
  async purchase(@Request() req, @Body() dto: PurchasePlanDto) {
    return this.merchantPlansService.purchase(
      req.user.userId,
      dto.tier,
      dto.interval,
      dto.paymentMethod,
    )
  }

  @Post('preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'What a plan change would cost, without committing to it',
  })
  @ApiResponse({ status: 201, description: 'Quote returned' })
  async preview(@Request() req, @Body() dto: PurchasePlanDto) {
    return this.merchantPlansService.previewChange(
      req.user.userId,
      dto.tier,
      dto.interval,
    )
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cancel the active subscription (access runs to period end)',
  })
  @ApiResponse({ status: 201, description: 'Subscription cancelled' })
  async cancel(@Request() req) {
    return this.merchantPlansService.cancelSubscription(req.user.userId)
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
