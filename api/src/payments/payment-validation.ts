export type PaystackPaymentValidationReason =
  | 'status_mismatch'
  | 'reference_mismatch'
  | 'amount_mismatch'
  | 'currency_mismatch'

export type PaystackPaymentValidationResult =
  { valid: true } | { valid: false; reason: PaystackPaymentValidationReason }

interface PaystackPaidValue {
  status?: unknown
  reference?: unknown
  amount?: unknown
  currency?: unknown
}

/**
 * Fail-closed validation used immediately before Paystack-funded value is
 * delivered. Paystack amounts are currency subunits (kobo for NGN).
 */
export function validatePaystackPaidValue(
  payment: PaystackPaidValue | null | undefined,
  expected: {
    reference: string
    amountKobo: number
    currency?: string
  },
): PaystackPaymentValidationResult {
  if (payment?.status !== 'success') {
    return { valid: false, reason: 'status_mismatch' }
  }
  if (payment.reference !== expected.reference) {
    return { valid: false, reason: 'reference_mismatch' }
  }
  if (
    typeof payment.amount !== 'number' ||
    !Number.isFinite(payment.amount) ||
    payment.amount !== expected.amountKobo
  ) {
    return { valid: false, reason: 'amount_mismatch' }
  }
  if (payment.currency !== (expected.currency || 'NGN')) {
    return { valid: false, reason: 'currency_mismatch' }
  }
  return { valid: true }
}
