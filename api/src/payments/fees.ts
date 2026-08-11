/**
 * Fee Engine for Paystack Collection Rail
 *
 * Fee Structure:
 * - Paystack: 1.5% + ₦100 flat fee. Flat fee waived for transactions < ₦2,500. Cap: ₦2,000.
 * - Firespot: 0.5% (configured as percentage_charge on the subaccount).
 * - Merchant Net: Gross - Paystack Fee - Firespot Fee.
 *
 * Source: Paystack Nigeria pricing & docs/paystack_rail.md
 */

export const PAYSTACK_RATE = 0.015;
export const PAYSTACK_FLAT_FEE = 100;
export const PAYSTACK_FEE_WAIVER_THRESHOLD = 2500;
export const PAYSTACK_FEE_CAP = 2000;
export const FIRESPOT_RATE = 0.005;

/**
 * Calculates Paystack's transaction fee in Naira.
 *
 * - Below ₦2,500: 1.5% (flat fee waived)
 * - ₦2,500 and above: 1.5% + ₦100, capped at ₦2,000
 */
export function calculatePaystackFee(amountNaira: number): number {
  if (amountNaira <= 0) return 0;

  if (amountNaira < PAYSTACK_FEE_WAIVER_THRESHOLD) {
    return amountNaira * PAYSTACK_RATE;
  }

  const uncappedFee = amountNaira * PAYSTACK_RATE + PAYSTACK_FLAT_FEE;
  return Math.min(uncappedFee, PAYSTACK_FEE_CAP);
}

/**
 * Calculates Firespot's 0.5% collection fee in Naira.
 */
export function calculateFirespotFee(amountNaira: number): number {
  if (amountNaira <= 0) return 0;
  return amountNaira * FIRESPOT_RATE;
}

export interface SplitBreakdown {
  gross: number;
  paystackFee: number;
  firespotFee: number;
  net: number;
}

/**
 * Computes the full fee breakdown in Naira. Confirmed transactions should
 * supply Paystack's reported fee; the pricing formula is a quote/legacy
 * fallback only. Values are rounded to 2 decimal places.
 */
export function splitBreakdown(
  amountNaira: number,
  actualPaystackFeeNaira?: number,
): SplitBreakdown {
  const gross = Math.max(0, amountNaira);
  const paystackFeeUnrounded =
    typeof actualPaystackFeeNaira === "number" &&
    Number.isFinite(actualPaystackFeeNaira)
      ? Math.max(0, actualPaystackFeeNaira)
      : calculatePaystackFee(gross);
  const firespotFeeUnrounded = calculateFirespotFee(gross);

  const paystackFee = Math.round(paystackFeeUnrounded * 100) / 100;
  const firespotFee = Math.round(firespotFeeUnrounded * 100) / 100;
  const net = Math.round((gross - paystackFee - firespotFee) * 100) / 100;

  return {
    gross,
    paystackFee,
    firespotFee,
    net,
  };
}
