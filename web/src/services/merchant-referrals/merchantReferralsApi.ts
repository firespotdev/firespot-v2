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
