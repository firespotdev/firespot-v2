import type { BillingInterval, PlanDefinition, PlanTier } from './interface'

/** Ordering of tiers. Higher rank = more capability. */
export const TIER_RANK: Record<PlanTier, number> = {
  LITE: 1,
  PRO: 2,
  PROMAX: 3,
}

/**
 * True when moving from `current` to `target` would lose capability.
 * Downgrades are not supported — a merchant can only move up. Mirrors the
 * server-side guard in merchant-plans.service.
 */
export function isDowngrade(
  current: PlanTier | null | undefined,
  target: PlanTier,
): boolean {
  if (!current) return false
  return TIER_RANK[target] < TIER_RANK[current]
}

/** Months billed up front for a given cycle. Annual is 12× monthly (no discount). */
export function periodsFor(interval: BillingInterval): number {
  return interval === 'annually' ? 12 : 1
}

/**
 * Total charged now for a plan. One-time tiers (LITE) ignore interval and
 * store count. PRO MAX multiplies by the merchant's active store count.
 */
export function planTotal(
  plan: PlanDefinition,
  interval: BillingInterval,
  storeCount: number,
): number {
  if (plan.billingType === 'one_time') return plan.price
  const stores = plan.perStore ? Math.max(1, storeCount) : 1
  return plan.price * stores * periodsFor(interval)
}

/** The per-unit price shown on the checkout line item. */
export function planUnitPrice(
  plan: PlanDefinition,
  interval: BillingInterval,
): number {
  if (plan.billingType === 'one_time') return plan.price
  return plan.price * periodsFor(interval)
}

/** Checkout "Frequency" label. */
export function frequencyLabel(
  plan: PlanDefinition,
  interval: BillingInterval,
): string {
  if (plan.billingType === 'one_time') return 'One time'
  return interval === 'annually' ? 'Yearly' : 'Monthly'
}
