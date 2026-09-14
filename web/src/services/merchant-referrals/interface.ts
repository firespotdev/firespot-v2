export type ReferralEligibilityReason =
  | 'not_a_merchant'
  | 'no_active_plan'
  | 'not_verified'
  | 'plan_lapsed'
  | null

export interface MerchantReferralLedgerEntry {
  _id: string
  referralId: string
  type: 'MERCHANT_REFERRAL'
  amount: number
  currency: 'NGN'
  status: 'EARNED'
  policyKey: string
  description: string
  earnedAt: string
}

export interface MerchantReferralSummary {
  referralCode: string
  eligible: boolean
  eligibilityReason: ReferralEligibilityReason
  thresholdAmount: number
  rewardAmount: number
  referralCounts: {
    attributed: number
    volumeQualified: number
    eligibilityPending: number
    ledgered: number
    disqualified: number
  }
  totalEarned: number
  ledger: MerchantReferralLedgerEntry[]
}
