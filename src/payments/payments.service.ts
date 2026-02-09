import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PaystackService } from "../users/services/paystack.service";
import { QRKitsService } from "../qr-kits/qr-kits.service";

@Injectable()
export class PaymentsService {
  constructor(
    private paystackService: PaystackService,
    private qrKitsService: QRKitsService,
  ) {}

  async handleWebhook(payload: any, signature: string, rawBody: string) {
    // Verify webhook signature
    const isValid = this.paystackService.verifyWebhookSignature(
      rawBody,
      signature,
    );
    if (!isValid) {
      throw new HttpException(
        "Invalid webhook signature",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const event = payload.event;
    const data = payload.data;

    if (event === "charge.success") {
      const reference = data.reference;
      await this.qrKitsService.completeActivationByWebhook(reference);
    }

    return { received: true };
  }
}
