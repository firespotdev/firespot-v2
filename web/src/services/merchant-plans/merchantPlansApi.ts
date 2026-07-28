'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import { KYC_STATUS_KEY } from '@/services/kyc'
import type {
  PlanCatalogResponse,
  PurchasePlanResponse,
  PlanPreviewResponse,
  VerifyPlanResponse,
  PlanTier,
  BillingInterval,
  PlanPaymentMethod,
  PlanPaymentMethodsResponse,
} from './interface'

export interface PurchaseArgs {
  tier: PlanTier
  interval?: BillingInterval
  paymentMethod?: PlanPaymentMethod
}

export const MerchantPlansApi = {
  getCatalog: async (): Promise<PlanCatalogResponse> => {
    const { data } = await apiClient.get('/merchant-plans')
    return data
  },

  getPaymentMethods: async (): Promise<PlanPaymentMethodsResponse> => {
    const { data } = await apiClient.get('/merchant-plans/payment-methods')
    return data
  },

  purchase: async ({
    tier,
    interval,
    paymentMethod,
  }: PurchaseArgs): Promise<PurchasePlanResponse> => {
    const { data } = await apiClient.post('/merchant-plans/purchase', {
      tier,
      interval,
      paymentMethod,
    })
    return data
  },

  preview: async ({
    tier,
    interval,
  }: PurchaseArgs): Promise<PlanPreviewResponse> => {
    const { data } = await apiClient.post('/merchant-plans/preview', {
      tier,
      interval,
    })
    return data
  },

  cancel: async (): Promise<{
    success: boolean
    cancelledCount: number
    activeUntil: string | null
  }> => {
    const { data } = await apiClient.post('/merchant-plans/cancel')
    return data
  },

  verify: async (reference: string): Promise<VerifyPlanResponse> => {
    const { data } = await apiClient.get(`/merchant-plans/verify/${reference}`)
    return data
  },
}

export const PLAN_CATALOG_KEY = ['merchant-plans']
export const PLAN_PAYMENT_METHODS_KEY = ['merchant-plan-payment-methods']

export const usePlanCatalog = (enabled = true) => {
  return useQuery({
    queryKey: PLAN_CATALOG_KEY,
    queryFn: () => MerchantPlansApi.getCatalog(),
    enabled,
  })
}

export const usePlanPaymentMethods = () => {
  return useQuery({
    queryKey: PLAN_PAYMENT_METHODS_KEY,
    queryFn: MerchantPlansApi.getPaymentMethods,
  })
}

/**
 * Quotes a plan change. The checkout must show this figure, not the list
 * price — a mid-cycle change is credited and the two differ.
 */
export const usePlanPreview = (args: PurchaseArgs | null) => {
  return useQuery({
    queryKey: ['merchant-plan-preview', args?.tier, args?.interval],
    queryFn: () => MerchantPlansApi.preview(args!),
    enabled: Boolean(args?.tier),
  })
}

export const usePurchasePlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: PurchaseArgs) => MerchantPlansApi.purchase(args),
    onSuccess: (res) => {
      // Immediate upgrades and scheduled downgrades change state without a
      // Paystack round-trip, so refresh rather than waiting for /plan-status.
      if (!res.authorizationUrl) {
        queryClient.invalidateQueries({ queryKey: PLAN_CATALOG_KEY })
        // A tier change moves the goalposts for verification, so /verify must
        // not render the previous tier's step list on arrival.
        queryClient.invalidateQueries({ queryKey: KYC_STATUS_KEY })
      }
    },
  })
}

export const useCancelPlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => MerchantPlansApi.cancel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAN_CATALOG_KEY })
    },
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
