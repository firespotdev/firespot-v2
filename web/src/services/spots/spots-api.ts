'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'

export interface Spot {
  _id: string
  merchantId: string
  name: string
  address?: string
  location?: string
  isActive: boolean
  isPrimary: boolean
  billingStatus:
    'pending' | 'active' | 'cancellation_pending' | 'cancelled' | 'failed'
  billingRequestKey?: string
  createdAt?: string
}

export interface SpotPayload {
  name: string
  address?: string
  location?: string
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

export const useSpots = () => {
  return useQuery({ queryKey: SPOTS_KEY, queryFn: () => SpotsApi.getSpots() })
}

export const useCreateSpot = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSpotPayload) => SpotsApi.createSpot(payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SPOTS_KEY }),
  })
}

export const useUpdateSpot = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SpotPayload }) =>
      SpotsApi.updateSpot(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SPOTS_KEY }),
  })
}

export const useDeleteSpot = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => SpotsApi.deleteSpot(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SPOTS_KEY }),
  })
}
