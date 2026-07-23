import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PaystackService } from "../users/services/paystack.service";
import { QRKitsService } from "../qr-kits/qr-kits.service";
import { QROrdersService } from "../qr-orders/qr-orders.service";
import { MerchantPlansService } from "../merchant-plans/merchant-plans.service";
import { PLAN_REFERENCE_PREFIX } from "../merchant-plans/constants/plans";

@Injectable()
export class PaymentsService {
  constructor(
    private paystackService: PaystackService,
    private qrKitsService: QRKitsService,
    private ordersService: QROrdersService,
    private merchantPlansService: MerchantPlansService,
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

      // NOTE: the final branch is a catch-all for QR kit activation, so any
      // new payment type MUST be matched by prefix *before* it.
      if (reference && reference.startsWith('ORD-')) {
        await this.ordersService.verifyPayment(reference);
      } else if (reference && reference.startsWith(PLAN_REFERENCE_PREFIX)) {
        await this.merchantPlansService.verifyPayment(reference);
        // A recurring tier's first charge also creates the subscription.
        await this.merchantPlansService.attachSubscriptionByCustomer(
          data?.customer?.customer_code,
          data?.subscription_code,
          data?.email_token,
          { planCode: data?.plan?.plan_code, interval: data?.plan?.interval },
        );
      } else {
        await this.qrKitsService.completeActivationByWebhook(reference);
      }
    }

    // ---- Subscription lifecycle (PRO / PRO MAX) ----
    const customerCode = data?.customer?.customer_code;

    if (event === "subscription.create") {
      // email_token is required later to disable this subscription.
      await this.merchantPlansService.attachSubscriptionByCustomer(
        customerCode,
        data?.subscription_code,
        data?.email_token,
        { planCode: data?.plan?.plan_code, interval: data?.plan?.interval },
      );
      // The new subscription is live, so retire any it replaces (interval
      // switch or tier upgrade) — otherwise the merchant is billed twice.
      await this.merchantPlansService.supersedePreviousSubscriptions(
        customerCode,
        data?.subscription_code,
      );
    }

    if (event === "invoice.payment_failed") {
      await this.merchantPlansService.handleSubscriptionLapse(
        customerCode,
        true,
      );
    }

    if (event === "subscription.disable" || event === "subscription.not_renew") {
      await this.merchantPlansService.handleSubscriptionLapse(
        customerCode,
        true,
      );
    }

    // Successful renewal invoice — extend the paid period. Both events fire
    // for the same invoice, so the reference is passed to dedupe them.
    if (event === "invoice.payment_succeeded" || event === "invoice.update") {
      if (data?.status === "success" || data?.paid === true) {
        await this.merchantPlansService.renewPeriod(
          customerCode,
          data?.invoice_code || data?.transaction?.reference || data?.reference,
        );
      }
    }

    return { received: true };
  }
}
