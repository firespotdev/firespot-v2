export type PlanTier = 'LITE' | 'PRO' | 'PROMAX'
export type KycCheck = 'bvn' | 'nin' | 'cac'
export type BillingType = 'one_time' | 'monthly'
export type BillingInterval = 'monthly' | 'annually'
export type PlanPaymentMethod = 'SAVED_AUTHORIZATION' | 'PAYSTACK_CHECKOUT'
export type PlanStatus = 'none' | 'paid' | 'verifying' | 'verified' | 'failed'

/** Why a merchant may not collect. null when they can. */
export type CollectBlockedReason = 'no_plan' | 'kyc_incomplete' | null

export interface PlanFeature {
  label: string
  included: boolean
  inheritsFrom?: PlanTier
  icon?: 'unverified' | 'verified' | 'verified_business'
}

export interface PlanDefinition {
  tier: PlanTier
  name: string
  price: number
  billingType: BillingType
  perStore: boolean
  tagline: string
  requiredSteps: Array<{
    key: KycCheck
    product: 'enhanced_kyc' | 'biometric_kyc' | 'kyb'
    idType: string
    label: string
  }>
  badge: 'PRO' | 'PROMAX' | null
  badgeLabel: string | null
  dailyCap: number
  features: PlanFeature[]
}

export interface CurrentPlanState {
  planTier: PlanTier | null
  planStatus: PlanStatus
  verificationLevel: 'PRO' | 'PROMAX' | null
  planCurrentPeriodEnd: string | null
  /** When a failed charge's grace window closes. */
  planGraceUntil: string | null
  /** What the merchant can actually use now — LITE once a lapse is final. */
  effectiveTier: PlanTier | null
  /** Grace window elapsed: demoted to the LITE floor. */
  isLapsed: boolean
  /** Charge failed but still inside the grace window. */
  isInGracePeriod: boolean
  /** Cancelled — access runs to planCurrentPeriodEnd, then LITE. */
  cancelAtPeriodEnd: boolean
  /** Billing cycle currently paid for, so the UI can offer a switch. */
  currentInterval: BillingInterval | null
  /** A downgrade scheduled to land when the current period ends. */
  pendingPlanChange: {
    tier: PlanTier
    interval: BillingInterval | null
    effectiveAt: string
  } | null
  /** May the merchant initiate a collection? Recording is never gated. */
  canCollect: boolean
  /** Why collecting is blocked, so the UI routes to the right fix. */
  collectBlockedReason: CollectBlockedReason
  /** Active stores — drives PRO MAX's per-store checkout total (min 1). */
  activeStoreCount: number
  nextStep: KycCheck | null
}

export interface PlanCatalogResponse {
  plans: PlanDefinition[]
  current: CurrentPlanState
}

export interface PlanPaymentMethodOption {
  id: PlanPaymentMethod
  label: string
  description: string
}

export interface PlanPaymentMethodsResponse {
  methods: PlanPaymentMethodOption[]
  defaultMethod: PlanPaymentMethod
}

/**
 * Purchasing can resolve through several paths, so the redirect URL is optional:
 *  - checkout            → send to Paystack (full price, or prorated fallback)
 *  - purchased           → charged a saved method for a fresh purchase
 *  - upgraded            → charged the saved card, tier applied immediately
 *  - scheduled_downgrade → free, lands at period end
 *  - cancellation        → PRO→LITE, which is just a cancel
 */
export interface PurchasePlanResponse {
  type?: 'checkout' | 'purchased' | 'upgraded' | 'scheduled_downgrade'
  /** Null when nothing needs paying in a browser. */
  authorizationUrl?: string | null
  reference?: string
  planOrderId?: string
  tier?: PlanTier
  amount?: number
  /** Prorated amount actually taken from the saved card. */
  amountCharged?: number
  /**
   * The first check the NEW tier still needs, or null when nothing is
   * outstanding. Only returned for in-place upgrades — they never round-trip
   * through Paystack, so this is the client's only cue to send the merchant
   * to verification.
   */
  nextStep?: KycCheck | null
  daysLeft?: number
  /** When a scheduled downgrade takes effect. */
  effectiveAt?: string
  /** Cancellation path (PRO → LITE). */
  success?: boolean
  activeUntil?: string | null
}

export type PlanChangeKind =
  | 'purchase'
  | 'prorated_upgrade'
  | 'scheduled_downgrade'
  | 'cadence_extension'
  | 'blocked_cadence'
  | 'cancellation'
  | 'noop'

/** What a change would cost — quoted by the same code that charges it. */
export interface PlanPreviewResponse {
  kind: PlanChangeKind
  tier: PlanTier
  interval: BillingInterval
  /** List price for a full period, before any credit. */
  fullAmount: number
  /** What the merchant actually pays now. */
  amountDue: number
  /** Cost for this window before credit — `subtotal − credit === amountDue`. */
  subtotal?: number
  /** Value of unused time deducted (0 when nothing to credit). */
  credit?: number
  storeCount: number
  blocked: boolean
  reason?: string
  /** True when nothing is charged now and the change lands at period end. */
  deferred?: boolean
  effectiveAt?: string | null
  /** True when the billing period restarts (monthly → yearly). */
  resetsPeriod?: boolean
  daysLeft?: number
}

export interface VerifyPlanResponse {
  success: boolean
  /**
   * PENDING means the transaction is still settling (bank transfer, USSD) —
   * not a failure. The charge.success webhook settles it shortly after.
   */
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING'
  tier?: PlanTier
  alreadyGranted?: boolean
  pending?: boolean
  /** Set when the amount paid did not match the order; value is never granted. */
  reason?: 'amount_mismatch'
}
