export type PlanTier = 'LITE' | 'PRO' | 'PROMAX'
export type BillingType = 'one_time' | 'monthly'

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
    requiredSteps: [STEP.bvnEnhanced, STEP.ninEnhanced],
    badge: null,
    badgeLabel: null,
    dailyCap: 50_000,
    features: [
      { label: 'No Verified User badge', included: false },
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
    // TEMPORARY: NIN is omitted here while it is validated on LITE first —
    // add STEP.ninEnhanced back once confirmed.
    requiredSteps: [STEP.bvnBiometric],
    badge: 'PRO',
    badgeLabel: 'Verified User',
    dailyCap: 200_000,
    features: [
      { label: 'Get a Verified User badge', included: true },
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
    // TEMPORARY: NIN omitted — see the PRO note above.
    requiredSteps: [STEP.bvnBiometric, STEP.cac],
    badge: 'PROMAX',
    badgeLabel: 'Verified Business',
    dailyCap: 5_000_000,
    features: [
      { label: 'Get a Verified Business badge', included: true },
      { label: 'Collect up to ₦5M daily', included: true },
      {
        label: 'Everything in FS Business Pro',
        included: true,
        inheritsFrom: 'PRO',
      },
      { label: 'Give your employees controlled access', included: true },
      { label: 'Eligibility to access loans for your business', included: true },
      { label: 'Use Firespot in multiple locations', included: true },
      { label: 'Early access to SalesBoost', included: true },
      { label: 'Automated reports', included: true },
    ],
  },
}

export const PLAN_TIERS: PlanTier[] = ['LITE', 'PRO', 'PROMAX']

/** Reference prefix used to route Paystack webhooks to plan purchases. */
export const PLAN_REFERENCE_PREFIX = 'PLAN-'

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
  return (
    (PRODUCT_STRENGTH[provenWith] ?? 1) >= PRODUCT_STRENGTH[step.product]
  )
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
