'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type {
  PlanCatalogResponse,
  PurchasePlanResponse,
  VerifyPlanResponse,
  PlanTier,
} from './interface'

export const MerchantPlansApi = {
  getCatalog: async (): Promise<PlanCatalogResponse> => {
    const { data } = await apiClient.get('/merchant-plans')
    return data
  },

  purchase: async (tier: PlanTier): Promise<PurchasePlanResponse> => {
    const { data } = await apiClient.post('/merchant-plans/purchase', { tier })
    return data
  },

  verify: async (reference: string): Promise<VerifyPlanResponse> => {
    const { data } = await apiClient.get(`/merchant-plans/verify/${reference}`)
    return data
  },
}

export const PLAN_CATALOG_KEY = ['merchant-plans']

export const usePlanCatalog = () => {
  return useQuery({
    queryKey: PLAN_CATALOG_KEY,
    queryFn: () => MerchantPlansApi.getCatalog(),
  })
}

export const usePurchasePlan = () => {
  return useMutation({
    mutationFn: (tier: PlanTier) => MerchantPlansApi.purchase(tier),
  })
}

export const useVerifyPlanPayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reference: string) => MerchantPlansApi.verify(reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAN_CATALOG_KEY })
      queryClient.invalidateQueries({ queryKey: ['kyc-status'] })
    },
  })
}
