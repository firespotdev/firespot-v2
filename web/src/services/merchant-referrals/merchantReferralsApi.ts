'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type { MerchantReferralSummary } from './interface'

export const MERCHANT_REFERRALS_KEY = ['merchant-referrals']

export const merchantReferralsApi = {
  getMine: async (): Promise<MerchantReferralSummary> => {
    const { data } = await apiClient.get<MerchantReferralSummary>(
      '/merchant-referrals/me',
    )
    return data
  },
}

export const useMerchantReferralSummary = (enabled = true) =>
  useQuery({
    queryKey: MERCHANT_REFERRALS_KEY,
    queryFn: merchantReferralsApi.getMine,
    enabled,
  })
