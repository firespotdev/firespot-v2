'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type {
  KycStatusResponse,
  KycSessionResponse,
  VerifyCacPayload,
} from './interface'
import type { KycCheck } from '../merchant-plans/interface'

export const KycApi = {
  getStatus: async (): Promise<KycStatusResponse> => {
    const { data } = await apiClient.get('/kyc/status')
    return data
  },

  createSession: async (): Promise<KycSessionResponse> => {
    const { data } = await apiClient.post('/kyc/session')
    return data
  },

  verifyCac: async (payload: VerifyCacPayload) => {
    const { data } = await apiClient.post('/kyc/cac', payload)
    return data
  },

  reconcile: async (check: KycCheck) => {
    const { data } = await apiClient.post(`/kyc/reconcile/${check}`)
    return data
  },
}

export const KYC_STATUS_KEY = ['kyc-status']

/**
 * Verification status. `pollWhilePending` turns on short polling so a result
 * arriving via SmileID's async callback lands in the UI without a refresh.
 */
export const useKycStatus = (pollWhilePending = false) => {
  return useQuery({
    queryKey: KYC_STATUS_KEY,
    queryFn: () => KycApi.getStatus(),
    refetchInterval: (query) => {
      if (!pollWhilePending) return false
      const data = query.state.data
      if (!data || data.isComplete) return false
      return 5000
    },
  })
}

const invalidateKyc = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: KYC_STATUS_KEY })
  queryClient.invalidateQueries({ queryKey: ['merchant-plans'] })
}

export const useCreateKycSession = () => {
  return useMutation({
    mutationFn: () => KycApi.createSession(),
  })
}

export const useVerifyCac = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: VerifyCacPayload) => KycApi.verifyCac(payload),
    onSuccess: () => invalidateKyc(queryClient),
  })
}

export const useReconcileCheck = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (check: KycCheck) => KycApi.reconcile(check),
    onSuccess: () => invalidateKyc(queryClient),
  })
}
