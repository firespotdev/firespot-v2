import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import { FeedbackService } from "./feedback.service";

@ApiTags("feedback")
@Controller("feedback")
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get("eligibility")
  getEligibility(
    @Query("saleId") saleId: string,
    @Query("serialNumber") serialNumber: string,
    @Headers("x-customer-fingerprint") fingerprint?: string,
  ) {
    return this.feedbackService.getEligibility(
      saleId,
      serialNumber,
      fingerprint,
    );
  }

  @Post()
  create(
    @Body() dto: CreateFeedbackDto,
    @Headers("x-customer-fingerprint") fingerprint?: string,
  ) {
    return this.feedbackService.create(dto, fingerprint);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  list(
    @Req() req: Request & { user: { userId: string } },
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.feedbackService.listForMerchant(
      req.user.userId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }
}
