'use client'

import { useQuery } from '@tanstack/react-query'
import { publicApiClient } from '@/lib/utils/axios'
import type {
  DiscoveredMerchant,
  DiscoveredProduct,
  DiscoveryParams,
  DiscoveryResponse,
} from './interface'

export const DiscoveryApi = {
  getMerchants: async (
    params?: DiscoveryParams,
  ): Promise<DiscoveryResponse<DiscoveredMerchant>> => {
    const { data } = await publicApiClient.get('/public/merchants', { params })
    return data
  },

  getProducts: async (
    params?: DiscoveryParams,
  ): Promise<DiscoveryResponse<DiscoveredProduct>> => {
    const { data } = await publicApiClient.get('/public/products', { params })
    return data
  },
}

export const useDiscoverMerchants = (
  params?: DiscoveryParams,
  enabled = true,
) =>
  useQuery({
    queryKey: ['public-discovery', 'merchants', params],
    queryFn: () => DiscoveryApi.getMerchants(params),
    enabled,
  })

export const useDiscoverProducts = (
  params?: DiscoveryParams,
  enabled = true,
) =>
  useQuery({
    queryKey: ['public-discovery', 'products', params],
    queryFn: () => DiscoveryApi.getProducts(params),
    enabled,
  })
