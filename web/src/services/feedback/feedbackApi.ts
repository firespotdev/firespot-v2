'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, publicApiClient } from '@/lib/utils/axios'
import { getCustomerFingerprint } from '@/lib/utils/customer-fingerprint'
import type {
  CreateFeedbackPayload,
  FeedbackEligibility,
  FeedbackListResponse,
} from './interface'

export const FEEDBACK_KEY = ['merchant-feedback']

export const feedbackApi = {
  getMerchantFeedback: async (): Promise<FeedbackListResponse> => {
    const { data } = await apiClient.get<FeedbackListResponse>('/feedback', {
      params: { page: 1, limit: 50 },
    })
    return data
  },

  getEligibility: async (
    saleId: string,
    serialNumber: string,
  ): Promise<FeedbackEligibility> => {
    const { data } = await publicApiClient.get<FeedbackEligibility>(
      '/feedback/eligibility',
      {
        params: { saleId, serialNumber },
        headers: {
          'x-customer-fingerprint': getCustomerFingerprint(),
        },
      },
    )
    return data
  },

  create: async (payload: CreateFeedbackPayload) => {
    const { data } = await publicApiClient.post('/feedback', payload, {
      headers: {
        'x-customer-fingerprint': getCustomerFingerprint(),
      },
    })
    return data
  },
}

export const useMerchantFeedback = (enabled = true) =>
  useQuery({
    queryKey: FEEDBACK_KEY,
    queryFn: feedbackApi.getMerchantFeedback,
    enabled,
  })

export const useFeedbackEligibility = (
  saleId?: string,
  serialNumber?: string,
) =>
  useQuery({
    queryKey: ['feedback-eligibility', saleId, serialNumber],
    queryFn: () => feedbackApi.getEligibility(saleId!, serialNumber!),
    enabled: Boolean(saleId && serialNumber),
    retry: false,
  })

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: feedbackApi.create,
    onSuccess: (_, payload) => {
      queryClient.setQueryData<FeedbackEligibility>(
        ['feedback-eligibility', payload.saleId, payload.serialNumber],
        { eligible: false, reason: 'submitted' },
      )
    },
  })
}
