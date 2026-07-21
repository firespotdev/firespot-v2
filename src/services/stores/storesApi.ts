'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'

export interface Store {
  _id: string
  merchantId: string
  name: string
  address?: string
  location?: string
  isActive: boolean
  createdAt?: string
}

export interface StorePayload {
  name: string
  address?: string
  location?: string
}

export const StoresApi = {
  getStores: async (): Promise<Store[]> => {
    const { data } = await apiClient.get('/stores')
    return data
  },

  createStore: async (payload: StorePayload): Promise<Store> => {
    const { data } = await apiClient.post('/stores', payload)
    return data
  },

  updateStore: async (id: string, payload: StorePayload): Promise<Store> => {
    const { data } = await apiClient.patch(`/stores/${id}`, payload)
    return data
  },

  deleteStore: async (id: string): Promise<Store> => {
    const { data } = await apiClient.delete(`/stores/${id}`)
    return data
  },
}

const STORES_KEY = ['stores']

export const useStores = () => {
  return useQuery({ queryKey: STORES_KEY, queryFn: () => StoresApi.getStores() })
}

export const useCreateStore = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: StorePayload) => StoresApi.createStore(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STORES_KEY }),
  })
}

export const useDeleteStore = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => StoresApi.deleteStore(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STORES_KEY }),
  })
}
