'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import { SHOP_SETUP_KEY } from '@/services/shop/shopApi'

/** Where a spot is, in the same shape as the profile's main address. */
export interface SpotAddress {
  state?: string
  city?: string
  address?: string
  additionalDetails?: string
  insideMarket?: boolean
  market?: string
  shoppingComplex?: string
  shopNumber?: string
  landmark?: string
}

export interface Spot extends SpotAddress {
  _id: string
  merchantId: string
  name: string
  location?: string
  isActive: boolean
  isPrimary: boolean
  billingStatus:
    'pending' | 'active' | 'cancellation_pending' | 'cancelled' | 'failed'
  billingRequestKey?: string
  createdAt?: string
}

export interface SpotPayload extends SpotAddress {
  name: string
}

export interface CreateSpotPayload extends SpotPayload {
  idempotencyKey: string
}

export const SpotsApi = {
  getSpots: async (): Promise<Spot[]> => {
    const { data } = await apiClient.get('/spots')
    return data
  },

  createSpot: async (payload: CreateSpotPayload): Promise<Spot> => {
    const { data } = await apiClient.post('/spots', payload)
    return data
  },

  updateSpot: async (id: string, payload: SpotPayload): Promise<Spot> => {
    const { data } = await apiClient.patch(`/spots/${id}`, payload)
    return data
  },

  deleteSpot: async (id: string): Promise<Spot> => {
    const { data } = await apiClient.delete(`/spots/${id}`)
    return data
  },
}

const SPOTS_KEY = ['spots']

/**
 * The main spot also saves the profile's main address, and the first spot
 * completes the "Add shop locations" setup step, so both refresh with it.
 */
const refreshSpots = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: SPOTS_KEY })
  queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
  queryClient.invalidateQueries({ queryKey: SHOP_SETUP_KEY })
}

export const useSpots = () => {
  return useQuery({ queryKey: SPOTS_KEY, queryFn: () => SpotsApi.getSpots() })
}

export const useCreateSpot = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSpotPayload) => SpotsApi.createSpot(payload),
    onSettled: () => refreshSpots(queryClient),
  })
}

export const useUpdateSpot = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SpotPayload }) =>
      SpotsApi.updateSpot(id, payload),
    onSuccess: () => refreshSpots(queryClient),
  })
}

export const useDeleteSpot = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => SpotsApi.deleteSpot(id),
    onSettled: () => refreshSpots(queryClient),
  })
}
