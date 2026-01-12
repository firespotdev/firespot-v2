'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type { UserProfile, QRKitActivationResponse } from './interface'

// API functions
export const userApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/users/me')
    return response.data
  },

  initiateActivation: async (
    serialNumber: string,
  ): Promise<QRKitActivationResponse> => {
    const response = await apiClient.post<QRKitActivationResponse>(
      `/qr-kits/${serialNumber}/activate`,
    )
    return response.data
  },
}

// Hooks
export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: userApi.getProfile,
  })
}

export function useInitiateActivation() {
  return useMutation({
    mutationFn: userApi.initiateActivation,
  })
}
