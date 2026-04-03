import { useQuery } from '@tanstack/react-query'
import { keepPreviousData } from '@tanstack/react-query'
import { adminApiClient } from '@/lib/utils/axios'
import type {
  MerchantStats,
  Merchant,
  MerchantWithDetails,
  MerchantListResponse,
  MerchantFilters,
  MerchantSpecificStats,
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

  getMerchantSpecificStats: async (id: string, params?: any): Promise<MerchantSpecificStats> => {
    const response = await adminApiClient.get<MerchantSpecificStats>(`/admin/merchants/${id}/stats`, {
      params,
    })
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

export const useMerchantOverviewStats = () => {
  return useQuery({
    queryKey: ['merchant-overview-stats'],
    queryFn: () => merchantsApi.getStats(),
  })
}

export const useMerchantSpecificStats = (id: string | null, params?: any) => {
  return useQuery({
    queryKey: ['merchant-specific-stats', id, params],
    queryFn: () => {
      if (!id) throw new Error('Merchant ID is required')
      return merchantsApi.getMerchantSpecificStats(id, params)
    },
    enabled: !!id,
  })
}

