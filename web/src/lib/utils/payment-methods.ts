import type { UserProfile } from '@/services/users'

export const LAST_PAYMENT_METHOD_MESSAGE =
  'You need at least one way to get paid. Turn on another payment method first.'

type PaymentProfile = Pick<
  UserProfile,
  | 'canCollect'
  | 'hasPayoutAccount'
  | 'paystackCollectionEnabled'
  | 'paystackCollectionChannels'
  | 'bankTransferEnabled'
  | 'bankAccounts'
>

/** Paystack can take a payment right now. */
export function isPaystackPaymentActive(profile: PaymentProfile): boolean {
  return (
    profile.canCollect === true &&
    profile.hasPayoutAccount === true &&
    profile.paystackCollectionEnabled === true &&
    (profile.paystackCollectionChannels?.length ?? 0) > 0
  )
}

/** A payer can transfer into at least one bank account. */
export function isBankTransferActive(profile: PaymentProfile): boolean {
  return (
    profile.bankTransferEnabled !== false &&
    profile.bankAccounts.some((account) => account.isEnabled !== false)
  )
}

const hasWayToGetPaid = (profile: PaymentProfile) =>
  isBankTransferActive(profile) || isPaystackPaymentActive(profile)

export interface PaymentMethodChange {
  bankTransferEnabled?: boolean
  paystackCollectionEnabled?: boolean
  account?: { accountNumber: string; enabled: boolean }
}

/**
 * True when a change would take a shop from payable to unpayable. Mirrors
 * the API's guard so the switch can explain itself before the request fails.
 */
export function leavesNoWayToGetPaid(
  profile: PaymentProfile | undefined,
  change: PaymentMethodChange,
): boolean {
  if (!profile || !hasWayToGetPaid(profile)) return false

  const { account } = change
  const after: PaymentProfile = {
    ...profile,
    bankTransferEnabled: change.bankTransferEnabled ?? profile.bankTransferEnabled,
    paystackCollectionEnabled:
      change.paystackCollectionEnabled ?? profile.paystackCollectionEnabled,
    bankAccounts: account
      ? profile.bankAccounts.map((item) =>
          item.accountNumber === account.accountNumber
            ? { ...item, isEnabled: account.enabled }
            : item,
        )
      : profile.bankAccounts,
  }
  return !hasWayToGetPaid(after)
}

export function getActivePaymentMethodCount(
  profile: UserProfile | undefined,
): number {
  if (!profile) return 0

  // Saved cards are charged through Paystack, so they need the payout account.
  const savedCardsActive =
    profile.canCollect === true &&
    profile.hasPayoutAccount === true &&
    profile.savedCardsCheckoutEnabled !== false

  return (
    Number(savedCardsActive) +
    Number(isPaystackPaymentActive(profile)) +
    Number(isBankTransferActive(profile))
  )
}
