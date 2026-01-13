'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type {
  UserProfile,
  QRKitActivationResponse,
  UpdateProfilePhotoResponse,
  SerialCheckResponse,
  PaymentVerificationResponse,
} from './interface'

// API functions
export const userApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/users/me')
    return response.data
  },

  checkSerialNumber: async (
    serialNumber: string,
  ): Promise<SerialCheckResponse> => {
    const response = await apiClient.get<SerialCheckResponse>(
      `/qr-kits/${serialNumber}/check`,
    )
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

  verifyPayment: async (
    reference: string,
  ): Promise<PaymentVerificationResponse> => {
    const response = await apiClient.get<PaymentVerificationResponse>(
      `/qr-kits/verify-payment/${reference}`,
    )
    return response.data
  },

  updateProfilePhoto: async (
    file: File,
  ): Promise<UpdateProfilePhotoResponse> => {
    const formData = new FormData()
    formData.append('photo', file)

    const response = await apiClient.patch<UpdateProfilePhotoResponse>(
      '/users/photo',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
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

export function useCheckSerialNumber() {
  return useMutation({
    mutationFn: userApi.checkSerialNumber,
  })
}

export function useInitiateActivation() {
  return useMutation({
    mutationFn: userApi.initiateActivation,
  })
}

export function useVerifyPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.verifyPayment,
    onSuccess: () => {
      // Invalidate user profile to refresh merchantSlug
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

export function useUpdateProfilePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.updateProfilePhoto,
    onSuccess: (data) => {
      // Update the profile cache with new photo URL
      queryClient.setQueryData(
        ['user', 'profile'],
        (oldData: UserProfile | undefined) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            profilePhotoUrl: data.profilePhotoUrl,
          }
        },
      )
      // Also invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}
