import type { KycCheck, PlanStatus, PlanTier } from '../merchant-plans/interface'

export type KycCheckStatus = 'pending' | 'passed' | 'failed'

/**
 * SmileID product proving a step.
 *  - enhanced_kyc  → ID-authority lookup, no selfie
 *  - biometric_kyc → the same lookup plus selfie + liveness, in one job
 *  - kyb           → business registry (CAC) lookup
 */
export type KycProduct = 'enhanced_kyc' | 'biometric_kyc' | 'kyb'

/** One row the merchant actually completes. */
export interface KycStep {
  key: KycCheck
  label: string
  product: KycProduct
  /** true when the step captures a selfie (biometric) */
  requiresSelfie: boolean
  status: KycCheckStatus
  checkedAt: string | null
  /** Why it failed, so the merchant can correct and retry. */
  reason: string | null
}

export interface KycStatusResponse {
  planTier: PlanTier | null
  planStatus: PlanStatus
  verificationLevel: 'PRO' | 'PROMAX' | null
  steps: KycStep[]
  /** The step to resume on; null once verification is complete. */
  nextStep: Pick<KycStep, 'key' | 'label' | 'product' | 'requiresSelfie'> | null
  isComplete: boolean
  /** 'web_sdk' opens the SmileID widget; 'server' uses our own form (CAC). */
  nextStepMode: 'web_sdk' | 'server' | null
}

export interface KycSessionResponse {
  token: string
  jobId: string
  check: KycCheck
  label: string
  product: KycProduct
  requiresSelfie: boolean
  userId: string
  /** Non-secret SmileID details the Web SDK needs on the client. */
  partnerId: string
  environment: 'sandbox' | 'live'
  callbackUrl: string
  logoUrl?: string
  privacyUrl?: string
  redirectUrl?: string
  /** Pre-selected country → ID types, e.g. { NG: ['BVN'] } — skips the pickers. */
  idSelection?: Record<string, string[]> | null
  consentRequired?: Record<string, string[]> | null
}

export interface VerifyCacPayload {
  rcNumber: string
  businessType?: string
}
