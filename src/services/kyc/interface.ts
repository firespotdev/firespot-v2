import type { KycCheck, PlanStatus, PlanTier } from '../merchant-plans/interface'

export type KycCheckStatus = 'pending' | 'passed' | 'failed'

export interface KycStatusResponse {
  planTier: PlanTier | null
  planStatus: PlanStatus
  verificationLevel: 'PRO' | 'PROMAX' | null
  requiredChecks: KycCheck[]
  checks: Record<KycCheck, { status: KycCheckStatus; checkedAt: string | null }>
  /** First check that hasn't passed — where the merchant resumes. */
  nextCheck: KycCheck | null
  isComplete: boolean
  /** 'web_sdk' opens the SmileID widget; 'server' posts the ID number. */
  nextCheckMode: 'web_sdk' | 'server' | null
}

export interface KycSessionResponse {
  token: string
  jobId: string
  check: KycCheck
  product: string
  userId: string
  /** Non-secret SmileID details the Web SDK needs on the client. */
  partnerId: string
  environment: 'sandbox' | 'live'
  callbackUrl: string
}

export interface VerifyNinPayload {
  idNumber: string
  firstName?: string
  lastName?: string
  dob?: string
}

export interface VerifyCacPayload {
  rcNumber: string
  businessType?: string
}
