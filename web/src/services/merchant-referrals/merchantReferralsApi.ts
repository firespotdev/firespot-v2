'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type { MerchantReferralSummary } from './interface'

export const MERCHANT_REFERRALS_KEY = ['merchant-referrals']

export const merchantReferralsApi = {
  getCode: async (): Promise<{ referralCode: string }> => {
    const { data } = await apiClient.get<{ referralCode: string }>(
      '/merchant-referrals/me/code',
    )
    return data
  },
  getMine: async (): Promise<MerchantReferralSummary> => {
    const { data } = await apiClient.get<MerchantReferralSummary>(
      '/merchant-referrals/me',
    )
    return data
  },
}

export const useMerchantReferralCode = (enabled = true) =>
  useQuery({
    queryKey: [...MERCHANT_REFERRALS_KEY, 'code'],
    queryFn: merchantReferralsApi.getCode,
    enabled,
    staleTime: 5 * 60 * 1000,
  })

export const useMerchantReferralSummary = (enabled = true) =>
  useQuery({
    queryKey: MERCHANT_REFERRALS_KEY,
    queryFn: merchantReferralsApi.getMine,
    enabled,
  })

/** Merchant sign-up link that credits the referring merchant. */
export function getMerchantInviteUrl(referralCode?: string) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined'
      ? window.location.origin
      : 'https://firespot.co')
  const url = new URL('/onboarding/merchant/start', appUrl)

  if (referralCode) {
    url.searchParams.set('mref', referralCode)
  }

  return url.toString()
}
