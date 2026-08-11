import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateRefundDto, RetryRefundDto } from "./dto/payment-cases.dto";
import { RefundsService } from "./refunds.service";

@ApiTags("refunds")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("refunds")
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateRefundDto) {
    return this.refundsService.requestRefund(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.refundsService.findMerchantRefunds(req.user.userId);
  }

  @Post(":id/retry-with-customer-details")
  retry(@Request() req, @Param("id") id: string, @Body() dto: RetryRefundDto) {
    return this.refundsService.retryWithCustomerDetails(
      req.user.userId,
      id,
      dto,
    );
  }
}
