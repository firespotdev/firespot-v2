import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type { InsightsQuery, MerchantInsightsResponse } from './interface'

export const insightsApi = {
  getMerchantInsights: async (
    query: InsightsQuery = {},
  ): Promise<MerchantInsightsResponse> => {
    const params = new URLSearchParams()
    if (query.preset) params.append('preset', query.preset)
    if (query.startDate) params.append('startDate', query.startDate)
    if (query.endDate) params.append('endDate', query.endDate)

    const queryString = params.toString()
    const url = queryString
      ? `/scans/merchant/insights?${queryString}`
      : '/scans/merchant/insights'

    const response = await apiClient.get<MerchantInsightsResponse>(url)
    return response.data
  },
}

export const useMerchantInsights = (query: InsightsQuery = {}) => {
  return useQuery({
    queryKey: ['merchant-insights', query.preset, query.startDate, query.endDate],
    queryFn: () => insightsApi.getMerchantInsights(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}
