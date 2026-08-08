import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { PaystackService } from "../users/services/paystack.service";
import { QRKitsService } from "../qr-kits/qr-kits.service";
import { QROrdersService } from "../qr-orders/qr-orders.service";
import { MerchantPlansService } from "../merchant-plans/merchant-plans.service";
import { PLAN_REFERENCE_PREFIX } from "../merchant-plans/constants/plans";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private paystackService: PaystackService,
    private qrKitsService: QRKitsService,
    private ordersService: QROrdersService,
    private merchantPlansService: MerchantPlansService,
  ) {}

  async handleWebhook(payload: any, signature: string, rawBody: string) {
    // Stays synchronous: a forged request must still be rejected with 401.
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

    // Acknowledge first, then process. Handling an event can make outbound
    // Paystack calls (fetchSubscription, disableSubscription); if that runs
    // long the request times out, Paystack sees no 200, and it retries every
    // 3 minutes for four tries then hourly for 72 hours — every retry redoing
    // the same slow work, precisely when Paystack is already struggling.
    // Safe because each handler is idempotent by design.
    void this.processEvent(payload?.event, payload?.data).catch((error) =>
      this.logger.error(
        `Failed to process Paystack webhook "${payload?.event}": ${error}`,
        error instanceof Error ? error.stack : undefined,
      ),
    );

    return { received: true };
  }

  /**
   * Routes a verified webhook event. Separated from handleWebhook so the 200
   * can be returned before this runs. Every branch must stay idempotent —
   * Paystack redelivers.
   */
  private async processEvent(event: string, data: any) {
    if (event === "charge.success") {
      const reference = data.reference;

      // NOTE: the final branch is a catch-all for QR kit activation, so any
      // new payment type MUST be matched by prefix *before* it.
      if (reference && reference.startsWith('ORD-')) {
        await this.ordersService.verifyPayment(reference);
      } else if (reference && reference.startsWith(PLAN_REFERENCE_PREFIX)) {
        // charge.success carries no subscription_code and no email_token (and
        // `plan` is {}), so the subscription cannot be recorded from here —
        // subscription.create below is what does it.
        await this.merchantPlansService.verifyPayment(reference);
      } else {
        await this.qrKitsService.completeActivationByWebhook(reference);
      }
    }

    // ---- Subscription lifecycle (PRO / PRO MAX) ----
    const customerCode = data?.customer?.customer_code;

    if (event === "subscription.create") {
      // NOTE: subscription.create does NOT carry email_token, despite it being
      // required to disable the subscription later. ensureEmailToken() fetches
      // it on demand; disable/not_renew are the events that do carry it.
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

    // The three subscription-ending events mean different things and must not
    // be collapsed. Only a failed charge is a lapse; the other two fire when we
    // disable a subscription ourselves (upgrade supersede, or cancellation).
    // See docs/paystack_llm.md §4.

    // A renewal charge failed. Invoice payloads NEST the subscription, unlike
    // subscription.* events which carry the code at the top level.
    if (event === "invoice.payment_failed") {
      await this.merchantPlansService.handleSubscriptionLapse(
        customerCode,
        data?.subscription?.subscription_code,
      );
    }

    // Status changed to non-renewing: won't be charged again, but the paid
    // period runs to its end. A cancellation, not a lapse.
    if (event === "subscription.not_renew") {
      await this.merchantPlansService.markSubscriptionNonRenewing(
        customerCode,
        data?.subscription_code,
        data?.email_token,
      );
    }

    // The subscription is actually over (arrives at the next payment date).
    if (event === "subscription.disable") {
      await this.merchantPlansService.markSubscriptionEnded(
        customerCode,
        data?.subscription_code,
        data?.status,
      );
    }

    // Successful renewal invoice. invoice.update is the ONLY event Paystack
    // raises for a successful renewal — there is no invoice.payment_succeeded.
    // Paystack retries undelivered webhooks for 72 hours, so the invoice code
    // is passed through to dedupe repeat deliveries.
    if (event === "invoice.update") {
      if (data?.status === "success" || data?.paid === true) {
        await this.merchantPlansService.renewPeriod(
          customerCode,
          data?.invoice_code || data?.transaction?.reference || data?.reference,
          // Paystack's own renewal date beats recomputing it locally. The
          // sibling period_start/period_end are unreliable, so they are not
          // used — see docs/paystack_llm.md §3.
          data?.subscription?.next_payment_date,
        );
      }
    }
  }
}
