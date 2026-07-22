export type PlanTier = 'LITE' | 'PRO' | 'PROMAX'
export type KycCheck = 'bvn' | 'nin' | 'cac'
export type BillingType = 'one_time' | 'monthly'
export type PlanStatus = 'none' | 'paid' | 'verifying' | 'verified' | 'failed'

export interface PlanFeature {
  label: string
  included: boolean
  inheritsFrom?: PlanTier
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
  nextStep: KycCheck | null
}

export interface PlanCatalogResponse {
  plans: PlanDefinition[]
  current: CurrentPlanState
}

export interface PurchasePlanResponse {
  authorizationUrl: string
  reference: string
  planOrderId: string
  tier: PlanTier
  amount: number
}

export interface VerifyPlanResponse {
  success: boolean
  status: 'SUCCESSFUL' | 'FAILED'
  tier?: PlanTier
  alreadyGranted?: boolean
}
