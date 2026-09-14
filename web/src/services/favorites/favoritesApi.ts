'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type { FavoritesResponse } from './interface'

export const FavoritesApi = {
  getFavorites: async (): Promise<FavoritesResponse> => {
    const { data } = await apiClient.get('/users/favorites')
    return data
  },

  addFavorite: async (merchantId: string): Promise<FavoritesResponse> => {
    const { data } = await apiClient.post(`/users/favorites/${merchantId}`)
    return data
  },

  removeFavorite: async (merchantId: string): Promise<FavoritesResponse> => {
    const { data } = await apiClient.delete(`/users/favorites/${merchantId}`)
    return data
  },
}

const FAVORITES_KEY = ['favorites']

export const useFavorites = () => {
  return useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: () => FavoritesApi.getFavorites(),
  })
}

export const useAddFavorite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (merchantId: string) => FavoritesApi.addFavorite(merchantId),
    onSuccess: (data) => {
      queryClient.setQueryData(FAVORITES_KEY, data)
    },
  })
}

export const useRemoveFavorite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (merchantId: string) => FavoritesApi.removeFavorite(merchantId),
    onSuccess: (data) => {
      queryClient.setQueryData(FAVORITES_KEY, data)
    },
  })
}
