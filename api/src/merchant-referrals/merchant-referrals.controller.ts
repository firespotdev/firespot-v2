import { Controller, Get, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { MerchantReferralsService } from './merchant-referrals.service'

@ApiTags('merchant-referrals')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('merchant-referrals')
export class MerchantReferralsController {
  constructor(
    private readonly merchantReferralsService: MerchantReferralsService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get merchant referral eligibility, counts and earned ledger',
  })
  getMine(@Request() req) {
    return this.merchantReferralsService.getSummary(req.user.userId)
  }
}
