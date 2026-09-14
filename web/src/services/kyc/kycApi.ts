'use client'

import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type {
  KycStatusResponse,
  KycSessionResponse,
  MarkKycSessionSubmittedPayload,
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

  markSessionSubmitted: async (payload: MarkKycSessionSubmittedPayload) => {
    const { data } = await apiClient.post('/kyc/session/submitted', payload)
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
  const queryClient = useQueryClient()
  const hasSynchronizedCompletion = useRef(false)
  const query = useQuery({
    queryKey: KYC_STATUS_KEY,
    queryFn: () => KycApi.getStatus(),
    refetchInterval: (query) => {
      if (!pollWhilePending) return false
      const data = query.state.data
      if (!data || data.isComplete) return false
      return data.steps.some((step) => step.isVerifying) ? 5000 : false
    },
  })

  useEffect(() => {
    if (!query.data?.isComplete) {
      hasSynchronizedCompletion.current = false
      return
    }
    if (hasSynchronizedCompletion.current) return

    hasSynchronizedCompletion.current = true
    // SmileID completes asynchronously. Submission invalidation happens before
    // the result exists, so refresh every surface that presents the final plan
    // and verification state once KYC polling observes completion.
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['merchant-plans'] }),
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] }),
    ])
  }, [query.data?.isComplete, queryClient])

  return query
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

export const useMarkKycSessionSubmitted = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MarkKycSessionSubmittedPayload) =>
      KycApi.markSessionSubmitted(payload),
    onSettled: () => invalidateKyc(queryClient),
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
