import { BadRequestException } from "@nestjs/common";
import { getCollectEligibility } from "../merchant-plans/constants/plans";
import {
  type ChannelEnvironment,
  type CollectionMerchant,
  getMerchantPaystackChannels,
} from "./paystack-collection-channels";

/**
 * The ways a payer can pay a shop. A shop must always keep at least one:
 * switching off the last one leaves its pay page with nothing to pay into.
 */

interface PayableAccount {
  isEnabled?: boolean;
}

export type PaymentMerchant<A extends PayableAccount = PayableAccount> =
  CollectionMerchant & {
    bankTransferEnabled?: boolean;
    bankAccounts?: A[];
    paystackSubaccountCode?: string;
  };

export const LAST_PAYMENT_METHOD_MESSAGE =
  "You need at least one way to get paid. Turn on another payment method first.";

const enabledAccounts = <A extends PayableAccount>(
  merchant: PaymentMerchant<A>,
) =>
  (merchant.bankAccounts ?? []).filter(
    (account) => account.isEnabled !== false,
  );

export function canTakeBankTransfer(merchant: PaymentMerchant): boolean {
  return (
    merchant.bankTransferEnabled !== false &&
    enabledAccounts(merchant).length > 0
  );
}

export function canTakePaystackPayments(
  merchant: PaymentMerchant,
  environment: ChannelEnvironment = process.env,
): boolean {
  return (
    Boolean(merchant.paystackSubaccountCode) &&
    getCollectEligibility(merchant).canCollect &&
    getMerchantPaystackChannels(merchant, environment).length > 0
  );
}

export function hasWorkingPaymentMethod(
  merchant: PaymentMerchant,
  environment: ChannelEnvironment = process.env,
): boolean {
  return (
    canTakeBankTransfer(merchant) ||
    canTakePaystackPayments(merchant, environment)
  );
}

/**
 * The bank accounts a payer sees. Switching bank transfer off means "take
 * Paystack instead", so when Paystack can't take payment (a lapsed plan,
 * unfinished KYC) the accounts come back rather than leaving nothing.
 */
export function payerBankAccounts<A extends PayableAccount>(
  merchant: PaymentMerchant<A>,
  environment: ChannelEnvironment = process.env,
): A[] {
  const enabled = enabledAccounts(merchant);
  if (canTakeBankTransfer(merchant)) return enabled;
  if (canTakePaystackPayments(merchant, environment)) return [];
  return enabled.length > 0 ? enabled : (merchant.bankAccounts ?? []);
}

/**
 * Refuses a settings change that takes a shop from payable to unpayable.
 * A shop that already had no working method can still change other settings.
 */
export function assertKeepsPaymentMethod(
  before: PaymentMerchant,
  after: PaymentMerchant,
  environment: ChannelEnvironment = process.env,
): void {
  if (
    hasWorkingPaymentMethod(before, environment) &&
    !hasWorkingPaymentMethod(after, environment)
  ) {
    throw new BadRequestException({
      message: LAST_PAYMENT_METHOD_MESSAGE,
      reason: "last_payment_method",
    });
  }
}

/** A copy of the fields that decide payability, taken before a change. */
export function paymentSnapshot(merchant: PaymentMerchant): PaymentMerchant {
  return {
    bankTransferEnabled: merchant.bankTransferEnabled,
    bankAccounts: (merchant.bankAccounts ?? []).map((account) => ({
      isEnabled: account.isEnabled,
    })),
    paystackSubaccountCode: merchant.paystackSubaccountCode,
    paystackCollectionEnabled: merchant.paystackCollectionEnabled,
    paystackCollectionChannels: merchant.paystackCollectionChannels
      ? [...merchant.paystackCollectionChannels]
      : undefined,
    planTier: merchant.planTier,
    planStatus: merchant.planStatus,
    planGraceUntil: merchant.planGraceUntil,
    kycCompletedAt: merchant.kycCompletedAt,
    pendingPlanChange: merchant.pendingPlanChange,
    cancelAtPeriodEnd: merchant.cancelAtPeriodEnd,
    planCurrentPeriodEnd: merchant.planCurrentPeriodEnd,
  };
}
