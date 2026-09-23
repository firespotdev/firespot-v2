'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { publicApiClient } from '@/lib/utils/axios'
import type {
  PublicBusinessFeedbackResponse,
  PublicBusinessProfile,
} from './interface'

export const BusinessProfileApi = {
  getProfile: async (identifier: string): Promise<PublicBusinessProfile> => {
    const { data } = await publicApiClient.get<PublicBusinessProfile>(
      `/public/merchants/${identifier}`,
    )
    return data
  },

  getFeedback: async (
    identifier: string,
    page: number,
  ): Promise<PublicBusinessFeedbackResponse> => {
    const { data } = await publicApiClient.get<PublicBusinessFeedbackResponse>(
      `/public/merchants/${identifier}/feedback`,
      { params: { page, limit: 10 } },
    )
    return data
  },
}

export const useBusinessProfile = (identifier?: string) =>
  useQuery({
    queryKey: ['public-business-profile', identifier],
    queryFn: () => BusinessProfileApi.getProfile(identifier!),
    enabled: Boolean(identifier),
    retry: false,
  })

export const useBusinessFeedback = (
  identifier?: string,
  enabled = true,
) =>
  useInfiniteQuery({
    queryKey: ['public-business-feedback', identifier],
    queryFn: ({ pageParam }) =>
      BusinessProfileApi.getFeedback(identifier!, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.lastPage
        ? lastPage.meta.page + 1
        : undefined,
    enabled: Boolean(identifier) && enabled,
  })
