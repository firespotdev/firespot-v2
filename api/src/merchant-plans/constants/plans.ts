export type PlanTier = 'LITE' | 'PRO' | 'PROMAX'
export type BillingType = 'one_time' | 'monthly'
export const PLAN_PAYMENT_METHODS = [
  'SAVED_AUTHORIZATION',
  'PAYSTACK_CHECKOUT',
] as const
export type PlanPaymentMethod = (typeof PLAN_PAYMENT_METHODS)[number]

/** Identity documents a tier can require. One stored record per key. */
export type KycCheck = 'bvn' | 'nin' | 'cac'

/**
 * SmileID product used to prove a check.
 *  - enhanced_kyc  → ID-authority lookup, returns the record. No selfie.
 *  - biometric_kyc → the same lookup PLUS selfie + liveness + face match
 *                    against the authority's photo, all in one job.
 *  - kyb           → business registry (CAC) lookup.
 *
 * Note there is no standalone "liveness" product: liveness is a property of
 * *how* an identity check was performed, which is why it isn't a KycCheck.
 */
export type KycProduct = 'enhanced_kyc' | 'biometric_kyc' | 'kyb'

/**
 * How much assurance each product gives. A stronger product satisfies a
 * weaker requirement, but not the reverse — this is what makes a LITE→PRO
 * upgrade correctly reopen the BVN step (enhanced no longer suffices) while a
 * PRO→anything move never re-asks for something already proven biometrically.
 */
export const PRODUCT_STRENGTH: Record<KycProduct, number> = {
  kyb: 1,
  enhanced_kyc: 1,
  biometric_kyc: 2,
}

export interface KycStepDef {
  key: KycCheck
  product: KycProduct
  /** SmileID id_type, e.g. BVN / NIN_V2 / BUSINESS_REGISTRATION */
  idType: string
  label: string
}

export interface PlanFeature {
  label: string
  /** false renders the greyed-out check (e.g. LITE's "No Verified User badge") */
  included: boolean
  /** rows like "Everything in FS Business Lite" that expand to the lower tier */
  inheritsFrom?: PlanTier
  /** Badge row renders this icon (/icons/{icon}.svg) instead of the check */
  icon?: 'unverified' | 'verified' | 'verified_business'
}

export interface PlanDefinition {
  tier: PlanTier
  name: string
  /** Naira. Converted to kobo at Paystack call sites. */
  price: number
  billingType: BillingType
  /** true when price is charged per store per period (PRO MAX) */
  perStore: boolean
  tagline: string
  /** Ordered verification steps the merchant must complete for this tier. */
  requiredSteps: KycStepDef[]
  /** Badge granted on full verification; null for LITE. */
  badge: 'PRO' | 'PROMAX' | null
  badgeLabel: string | null
  /** Hard daily recording cap in Naira. */
  dailyCap: number
  features: PlanFeature[]
}

/** Reusable step definitions, so tiers compose rather than repeat them. */
const STEP = {
  /** BVN looked up against the authority. No selfie. */
  bvnEnhanced: {
    key: 'bvn',
    product: 'enhanced_kyc',
    idType: 'BVN',
    label: 'Bank Verification Number',
  },
  /** BVN + selfie + liveness, face-matched to the BVN photo. One job. */
  bvnBiometric: {
    key: 'bvn',
    product: 'biometric_kyc',
    idType: 'BVN',
    label: 'Identity & selfie (BVN)',
  },
  ninEnhanced: {
    key: 'nin',
    product: 'enhanced_kyc',
    idType: 'NIN_V2',
    label: 'National Identity Number',
  },
  cac: {
    key: 'cac',
    product: 'kyb',
    idType: 'BUSINESS_REGISTRATION',
    label: 'CAC business registration',
  },
} satisfies Record<string, KycStepDef>

/**
 * Single source of truth for tier pricing, KYC requirements, caps and the
 * marketing copy. The frontend reads this via GET /merchant-plans so the copy
 * lives in exactly one place.
 *
 * NOTE: the "2% + ₦100 transaction fee", next-day settlement and instant
 * confirmation bullets describe the future Paystack collection rail. They are
 * displayed only — no fee or settlement logic exists yet.
 */
export const PLANS: Record<PlanTier, PlanDefinition> = {
  LITE: {
    tier: 'LITE',
    name: 'Firespot Business Lite',
    price: 1000,
    billingType: 'one_time',
    perStore: false,
    tagline:
      'For businesses not yet registered with the CAC. All you need is BVN + NIN.',
    requiredSteps: [STEP.ninEnhanced, STEP.bvnEnhanced],
    badge: null,
    badgeLabel: null,
    dailyCap: 50_000,
    features: [
      { label: 'No Verified User badge', included: false, icon: 'unverified' },
      { label: 'Collect up to ₦50K daily', included: true },
      { label: 'Accept bank transfers from any bank', included: true },
      { label: 'Payouts settled into your bank next day', included: true },
      { label: 'Bank transfers confirmed instantly', included: true },
      { label: 'Read-aloud payment notifications', included: true },
      { label: 'Searchable transaction history', included: true },
      { label: '2% + ₦100 transaction fee', included: true },
    ],
  },
  PRO: {
    tier: 'PRO',
    name: 'Firespot Business Pro',
    price: 6000,
    billingType: 'monthly',
    perStore: false,
    tagline:
      'Sell online and offline, all sales recorded automatically. You need BVN + NIN + Liveness check (Selfie).',
    // The biometric BVN step covers identity AND liveness in one job.
    requiredSteps: [STEP.ninEnhanced, STEP.bvnBiometric],
    badge: 'PRO',
    badgeLabel: 'Verified User',
    dailyCap: 200_000,
    features: [
      { label: 'Get a Verified User badge', included: true, icon: 'verified' },
      { label: 'Collect up to ₦200K daily', included: true },
      {
        label: 'Everything in FS Business Lite',
        included: true,
        inheritsFrom: 'LITE',
      },
      { label: 'Accept multiple payment options', included: true },
      { label: 'Showcase your products and services', included: true },
      { label: 'See who buys from you and how often', included: true },
      { label: 'Collect feedback from customers', included: true },
      { label: 'Manage and fulfil orders', included: true },
    ],
  },
  PROMAX: {
    tier: 'PROMAX',
    name: 'Firespot Business Pro Max',
    price: 10_000,
    billingType: 'monthly',
    perStore: true,
    tagline:
      'Run your business fully on Firespot Business Platform. You need BVN + NIN + Liveness check (Selfie) + CAC.',
    requiredSteps: [STEP.ninEnhanced, STEP.bvnBiometric, STEP.cac],
    badge: 'PROMAX',
    badgeLabel: 'Verified Business',
    dailyCap: 5_000_000,
    features: [
      {
        label: 'Get a Verified Business badge',
        included: true,
        icon: 'verified_business',
      },
      { label: 'Collect up to ₦5M daily', included: true },
      {
        label: 'Everything in FS Business Pro',
        included: true,
        inheritsFrom: 'PRO',
      },
      { label: 'Give your employees controlled access', included: true },
      {
        label: 'Eligibility to access loans for your business',
        included: true,
      },
      { label: 'Use Firespot in multiple locations', included: true },
      { label: 'Early access to SalesBoost', included: true },
      { label: 'Automated reports', included: true },
    ],
  },
}

export const PLAN_TIERS: PlanTier[] = ['LITE', 'PRO', 'PROMAX']

/** Ordering of tiers. Higher rank = more capability. */
export const TIER_RANK: Record<PlanTier, number> = {
  LITE: 1,
  PRO: 2,
  PROMAX: 3,
}

/** Days a merchant keeps full access after a failed subscription charge. */
export const GRACE_PERIOD_DAYS = 7

/**
 * Where a lapsed subscriber lands. LITE is a one-time, lifetime purchase, so
 * it is the floor for anyone who has ever paid — they lose the subscription
 * tier, not their account.
 */
export const LAPSED_FALLBACK_TIER: PlanTier = 'LITE'

/** A downgrade scheduled to land at the end of the current period. */
export interface PendingPlanChangeLike {
  tier: string
  interval?: string
  effectiveAt: Date
}

/** The plan fields the entitlement resolver needs off a User document. */
export interface PlanStateLike {
  planTier?: string
  planStatus?: string
  planGraceUntil?: Date | null
  kycCompletedAt?: Date | null
  pendingPlanChange?: PendingPlanChangeLike | null
}

/** True once a scheduled change's effective date has arrived. */
export function isPlanChangeDue(user: PlanStateLike): boolean {
  const at = user.pendingPlanChange?.effectiveAt
  if (!at) return false
  return Date.now() >= new Date(at).getTime()
}

/** True when a change is scheduled but hasn't landed yet (drives UI copy). */
export function hasPendingPlanChange(user: PlanStateLike): boolean {
  return Boolean(user.pendingPlanChange) && !isPlanChangeDue(user)
}

/** Why a merchant may not collect. null when they can. */
export type CollectBlockedReason = 'no_plan' | 'kyc_incomplete' | null

/**
 * The tier a merchant is entitled to *right now* — the single source every
 * entitlement check must use instead of reading `planTier` directly.
 *
 * Computed lazily from dates, so no scheduled job is needed: a merchant whose
 * grace window has elapsed is demoted the moment anything asks.
 *
 * Returns undefined for grandfathered merchants (never bought a plan), who
 * remain exempt from plan limits.
 */
export function getEffectiveTier(user: PlanStateLike): PlanTier | undefined {
  // A scheduled downgrade wins once its date passes, even before the record
  // is materialised — so reads are correct the instant it falls due.
  let tier = user.planTier as PlanTier | undefined
  if (isPlanChangeDue(user)) {
    const scheduled = user.pendingPlanChange!.tier as PlanTier
    if (PLANS[scheduled]) tier = scheduled
  }

  if (!tier || !PLANS[tier]) return undefined

  // Only a failed subscription can demote; every other status keeps the tier.
  if (user.planStatus !== 'failed') return tier

  const graceUntil = user.planGraceUntil
    ? new Date(user.planGraceUntil).getTime()
    : 0
  if (graceUntil && Date.now() < graceUntil) return tier

  return LAPSED_FALLBACK_TIER
}

/** True once a failed subscription's grace window has elapsed. */
export function isLapsed(user: PlanStateLike): boolean {
  if (!user.planTier) return false
  if (user.planStatus !== 'failed') return false
  const graceUntil = user.planGraceUntil
    ? new Date(user.planGraceUntil).getTime()
    : 0
  return !graceUntil || Date.now() >= graceUntil
}

/** True while a failed charge is still inside its grace window. */
export function isInGracePeriod(user: PlanStateLike): boolean {
  return user.planStatus === 'failed' && !isLapsed(user)
}

/** How a requested plan change should be executed. */
export type PlanChangeKind =
  | 'purchase' // no live subscription → normal full-price checkout
  | 'prorated_upgrade' // same cadence, tier up → charge difference, keep renewal
  | 'scheduled_downgrade' // same cadence, tier down → defer to period end, free
  | 'cadence_extension' // monthly → yearly → full price − credit, period resets
  | 'blocked_cadence' // yearly → monthly → not allowed
  | 'cancellation' // → LITE, which is returned free at period end
  | 'noop' // already on exactly this plan

/**
 * Decides how a plan change is executed. **Cadence dominates tier**: scaling a
 * yearly price by the fraction left of a monthly period is meaningless, so a
 * change of billing cadence is classified before tier direction is considered.
 */
export function classifyPlanChange(params: {
  currentTier?: string | null
  currentInterval?: string | null
  targetTier: string
  targetInterval: 'monthly' | 'annually'
  hasLiveSubscription: boolean
}): PlanChangeKind {
  const { currentTier, targetTier, targetInterval, hasLiveSubscription } =
    params
  const targetPlan = PLANS[targetTier as PlanTier]

  // Without a live subscription there is nothing to prorate against.
  if (!hasLiveSubscription || !currentTier) return 'purchase'

  // Dropping to LITE is a cancellation — the LITE floor returns free once the
  // subscription ends, so charging for it would bill twice.
  if (targetTier === 'LITE' && isDowngrade(currentTier, 'LITE')) {
    return 'cancellation'
  }

  // One-time tiers have no cadence of their own.
  const currentInterval = params.currentInterval === 'annually' ? 'annually' : 'monthly'
  const effectiveTarget =
    targetPlan?.billingType === 'monthly' ? targetInterval : 'monthly'

  const sameTier = currentTier === targetTier
  const sameCadence = currentInterval === effectiveTarget

  if (sameTier && sameCadence) return 'noop'

  // ---- Cadence first ----
  if (!sameCadence) {
    // Shortening commitment mid-term is not supported: the merchant has
    // prepaid a year. They cancel and resubscribe once it ends.
    if (currentInterval === 'annually') return 'blocked_cadence'
    // Lengthening buys a fresh period at full price, less unused credit.
    return 'cadence_extension'
  }

  // ---- Same cadence: tier direction decides ----
  return isDowngrade(currentTier, targetTier)
    ? 'scheduled_downgrade'
    : 'prorated_upgrade'
}

/**
 * Resolves the current billing window, deriving a missing start date.
 *
 * `planCurrentPeriodStart` was added after plans shipped, so subscriptions
 * bought before it exists have only an end date. Without a start there is no
 * period length to prorate against, and proration would silently return 0 —
 * handing those merchants a free upgrade. The start is inferred from the end
 * and the cadence instead.
 */
export function resolvePeriodWindow(params: {
  periodStart?: Date | null
  periodEnd?: Date | null
  interval: 'monthly' | 'annually'
}): { periodStart: Date | null; periodEnd: Date | null } {
  const end = params.periodEnd ? new Date(params.periodEnd) : null
  if (!end) return { periodStart: null, periodEnd: null }

  if (params.periodStart) {
    return { periodStart: new Date(params.periodStart), periodEnd: end }
  }

  const derived = new Date(end)
  derived.setMonth(derived.getMonth() - (params.interval === 'annually' ? 12 : 1))
  return { periodStart: derived, periodEnd: end }
}

/**
 * Prorated amount owed when upgrading mid-cycle.
 *
 * Paystack has no proration, so we compute it: credit the unused portion of
 * what they already paid against the new tier's cost for the days remaining.
 * The billing date never moves — only the difference is charged now, and the
 * new subscription's first full charge lands on the original renewal date.
 *
 * Amounts are per-period totals (already store-multiplied for PRO MAX).
 * Returns 0 when the period is over/unknown or the credit covers the upgrade.
 */
export function calculateProration(params: {
  currentAmount: number
  newAmount: number
  periodStart: Date | null | undefined
  periodEnd: Date | null | undefined
  now?: Date
  /**
   * True when the new plan starts a fresh period rather than riding out the
   * current one (monthly → yearly). The new price is then charged in full —
   * a year is a year, not a fraction of the month it replaced — while the
   * unused credit is still deducted.
   */
  resetsPeriod?: boolean
}): {
  amountDue: number
  /**
   * Cost of the new plan for this billing window — the figure the credit is
   * deducted from. Shown as the checkout subtotal so that
   * `subtotal − credit === amountDue` on screen.
   */
  subtotal: number
  /** Value of the unused time being deducted — shown to the merchant. */
  credit: number
  daysLeft: number
  periodDays: number
} {
  const now = (params.now || new Date()).getTime()
  const start = params.periodStart ? new Date(params.periodStart).getTime() : 0
  const end = params.periodEnd ? new Date(params.periodEnd).getTime() : 0

  const DAY = 24 * 60 * 60 * 1000
  const periodMs = end - start
  const remainingMs = end - now

  // No usable period (unknown dates, or already expired) → no credit to give.
  // A resetting change still owes the full new price; a same-cadence one has
  // nothing left to prorate.
  if (!start || !end || periodMs <= 0 || remainingMs <= 0) {
    return {
      amountDue: params.resetsPeriod ? Math.round(params.newAmount) : 0,
      subtotal: params.resetsPeriod ? Math.round(params.newAmount) : 0,
      credit: 0,
      daysLeft: 0,
      periodDays: 0,
    }
  }

  const ratio = remainingMs / periodMs
  const credit = params.currentAmount * ratio
  // A resetting change buys a whole new period, so the new price is NOT
  // scaled by what remains of the old one — only the credit is.
  const newCost = params.resetsPeriod
    ? params.newAmount
    : params.newAmount * ratio

  return {
    amountDue: Math.max(0, Math.round(newCost - credit)),
    subtotal: Math.round(newCost),
    credit: Math.round(credit),
    daysLeft: Math.ceil(remainingMs / DAY),
    periodDays: Math.round(periodMs / DAY),
  }
}

/**
 * Has the merchant ever completed KYC for their tier?
 *
 * Prefers the durable `kycCompletedAt`; falls back to `planStatus` for rows
 * verified before that field existed. The fallback can be dropped once those
 * are backfilled.
 */
export function hasCompletedKyc(user: PlanStateLike): boolean {
  return Boolean(user.kycCompletedAt) || user.planStatus === 'verified'
}

/**
 * Whether a merchant may *initiate a collection* (the merchant-driven payment
 * request). Recording — including a customer scanning their QR — is never
 * gated by this.
 *
 * Requires both a plan and completed KYC. A lapsed merchant keeps the LITE
 * floor and their kycCompletedAt, so they can still collect.
 */
export function getCollectEligibility(user: PlanStateLike): {
  canCollect: boolean
  reason: CollectBlockedReason
} {
  if (!getEffectiveTier(user)) {
    return { canCollect: false, reason: 'no_plan' }
  }
  if (!hasCompletedKyc(user)) {
    return { canCollect: false, reason: 'kyc_incomplete' }
  }
  return { canCollect: true, reason: null }
}

/**
 * True when moving from `current` to `target` would lose capability.
 * Downgrades are not supported — a merchant can only move up.
 */
export function isDowngrade(
  current: string | undefined | null,
  target: string,
): boolean {
  if (!current) return false
  const from = TIER_RANK[current as PlanTier]
  const to = TIER_RANK[target as PlanTier]
  if (!from || !to) return false
  return to < from
}

/** Reference prefix used to route Paystack webhooks to plan purchases. */
export const PLAN_REFERENCE_PREFIX = 'PLAN-'

/**
 * Below this, a prorated upgrade is waived rather than charged — Paystack
 * rejects trivially small transactions, and failing an upgrade over a few
 * naira is worse than absorbing it.
 */
export const MIN_CHARGE_NAIRA = 100

export function getPlan(tier: string): PlanDefinition | undefined {
  return PLANS[tier as PlanTier]
}

/** Stored state of one check, as persisted on User.kyc.<key>. */
export interface StoredCheckState {
  status?: string
  product?: string
}

/**
 * A step counts as done only when it passed AND was proven by a product at
 * least as strong as the step requires. A LITE merchant's `enhanced` BVN
 * therefore does not satisfy PRO's `biometric` BVN, so the step reopens and is
 * redone once — with the selfie — instead of being falsely shown as complete.
 */
export function isStepSatisfied(
  step: KycStepDef,
  state?: StoredCheckState,
): boolean {
  if (state?.status !== 'passed') return false
  // Records written before products were tracked are treated as enhanced.
  const provenWith = (state.product as KycProduct) || 'enhanced_kyc'
  return (PRODUCT_STRENGTH[provenWith] ?? 1) >= PRODUCT_STRENGTH[step.product]
}

/**
 * The first unsatisfied step — where a merchant resumes after dropping off.
 * Returns null when the tier is fully verified.
 */
export function getNextStep(
  tier: PlanTier,
  kyc?: Record<string, StoredCheckState | undefined>,
): KycStepDef | null {
  for (const step of PLANS[tier].requiredSteps) {
    if (!isStepSatisfied(step, kyc?.[step.key])) return step
  }
  return null
}
