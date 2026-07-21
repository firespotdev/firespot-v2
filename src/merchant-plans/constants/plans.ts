export type PlanTier = 'LITE' | 'PRO' | 'PROMAX'
export type KycCheck = 'bvn' | 'nin' | 'liveness' | 'cac'
export type BillingType = 'one_time' | 'monthly'

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
  requiredChecks: KycCheck[]
  /** Badge granted on full verification; null for LITE. */
  badge: 'PRO' | 'PROMAX' | null
  badgeLabel: string | null
  /** Hard daily recording cap in Naira. */
  dailyCap: number
  features: PlanFeature[]
}

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
    requiredChecks: ['bvn', 'nin'],
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
    requiredChecks: ['bvn', 'nin', 'liveness'],
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
    requiredChecks: ['bvn', 'nin', 'liveness', 'cac'],
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

/**
 * The first required check that hasn't passed — where a merchant resumes their
 * verification after dropping off. Returns null when the tier is fully verified.
 */
export function getNextCheck(
  tier: PlanTier,
  kyc?: Record<string, { status?: string } | undefined>,
): KycCheck | null {
  const required = PLANS[tier].requiredChecks
  for (const check of required) {
    if (kyc?.[check]?.status !== 'passed') {
      return check
    }
  }
  return null
}
