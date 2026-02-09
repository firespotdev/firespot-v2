import { Controller, Post, Headers, Body, Req } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import type { Request } from "express";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("webhook")
  @ApiOperation({
    summary: "Paystack webhook endpoint",
    description:
      "Receives webhook events from Paystack for payment notifications.",
  })
  @ApiHeader({
    name: "x-paystack-signature",
    description: "Paystack webhook signature for verification",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Webhook received successfully",
    schema: {
      type: "object",
      properties: {
        received: { type: "boolean", example: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Invalid webhook signature",
  })
  async handleWebhook(
    @Headers("x-paystack-signature") signature: string,
    @Body() payload: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
    return this.paymentsService.handleWebhook(payload, signature, rawBody);
  }
}
