import { safeSessionStorage } from './storage'

const storageKey = (saleId: string) => `firespot-card-failure:${saleId}`

const FRIENDLY_REASONS: Array<[RegExp, string]> = [
  [/insufficient/i, 'The card couldn’t be charged due to insufficient balance.'],
  [/expired/i, 'This card has expired.'],
  [
    /declin|do not hono(u)?r|not permitted|restricted|blocked/i,
    'Your bank declined this charge.',
  ],
]

/**
 * Turns a card processor's response ("Insufficient Funds", "Declined") into a
 * sentence a customer can act on.
 */
export function cardFailureReason(message?: string): string {
  const match = FRIENDLY_REASONS.find(([pattern]) =>
    pattern.test(message || ''),
  )
  return match
    ? match[1]
    : 'The card couldn’t be charged. Try another payment method.'
}

/**
 * The failure is shown after redirecting to the sale, so it is carried across
 * in session storage and kept until the customer dismisses it.
 */
export function rememberCardFailure(saleId: string, reason: string) {
  safeSessionStorage.setItem(storageKey(saleId), reason)
}

export function readCardFailure(saleId: string): string | null {
  return safeSessionStorage.getItem(storageKey(saleId))
}

export function forgetCardFailure(saleId: string) {
  safeSessionStorage.removeItem(storageKey(saleId))
}

/** Paystack reported the attempt failed; it doesn't say why. */
export const PAYSTACK_FAILED_REASON =
  'Your payment couldn’t be completed. Try again or use another payment method.'

/**
 * Errors from starting a payment are the API's own customer-facing messages
 * (daily limits, unavailable methods), so they are shown as they are.
 */
export function paymentStartFailureReason(error: unknown): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ||
    'We couldn’t start this payment. Try again or use another payment method.'
  )
}
