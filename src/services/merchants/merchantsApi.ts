import { useQuery } from '@tanstack/react-query'
import { keepPreviousData } from '@tanstack/react-query'
import { adminApiClient } from '@/lib/utils/axios'
import type {
  MerchantStats,
  Merchant,
  MerchantWithDetails,
  MerchantListResponse,
  MerchantFilters,
} from './interface'

// API functions
export const merchantsApi = {
  getMerchants: async (filters?: MerchantFilters): Promise<MerchantListResponse> => {
    const response = await adminApiClient.get<MerchantListResponse>('/admin/merchants', {
      params: filters,
    })
    return response.data
  },

  getMerchantById: async (id: string): Promise<MerchantWithDetails> => {
    const response = await adminApiClient.get<MerchantWithDetails>(`/admin/merchants/${id}`)
    return response.data
  },

  getStats: async (): Promise<MerchantStats> => {
    const response = await adminApiClient.get<MerchantStats>('/admin/merchants/stats')
    return response.data
  },
}

// React Query Hooks
export const useMerchants = (filters?: MerchantFilters) => {
  return useQuery({
    queryKey: ['merchants', filters],
    queryFn: () => merchantsApi.getMerchants(filters),
    placeholderData: keepPreviousData,
  })
}

export const useMerchant = (id: string | null) => {
  return useQuery({
    queryKey: ['merchant', id],
    queryFn: () => {
      if (!id) throw new Error('Merchant ID is required')
      return merchantsApi.getMerchantById(id)
    },
    enabled: !!id,
    placeholderData: keepPreviousData,
  })
}

export const useMerchantStats = () => {
  return useQuery({
    queryKey: ['merchant-stats'],
    queryFn: () => merchantsApi.getStats(),
  })
}

