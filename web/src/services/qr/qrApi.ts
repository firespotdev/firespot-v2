import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { publicApiClient, apiClient } from '@/lib/utils/axios'
import { useAuthStore } from '@/services/auth/authSlice'
import { getCustomerFingerprint } from '@/lib/utils/customer-fingerprint'
import type {
  QRKit,
  QRKitListResponse,
  MerchantProfile,
} from './interface'

export const publicQrApi = {
  getMerchantBySerial: async (
    serialNumber: string,
    authenticated = false,
  ): Promise<MerchantProfile> => {
    const fingerprint = getCustomerFingerprint()
    const response = await (authenticated ? apiClient : publicApiClient).get<MerchantProfile>(
      `/qr-kits/${serialNumber}`,
      {
        headers: {
          'x-customer-fingerprint': fingerprint,
        },
      },
    )
    return response.data
  },

  getAvailability: async (): Promise<{ availableCount: number }> => {
    const response = await publicApiClient.get<{ availableCount: number }>(
      '/qr-kits/availability',
    )
    return response.data
  },
}

export const userQrApi = {
  getUserQRKits: async (): Promise<QRKitListResponse> => {
    const response = await apiClient.get<QRKitListResponse>('/users/me/qr-kits')
    return response.data
  },

  getUserQRKitById: async (id: string): Promise<QRKit> => {
    const response = await apiClient.get<QRKit>(`/users/me/qr-kits/${id}`)
    return response.data
  },

  updateUserQRKit: async (
    id: string,
    data: { name?: string; collectFeedback?: boolean },
  ): Promise<{ message: string; qrKit: QRKit }> => {
    const response = await apiClient.patch<{ message: string; qrKit: QRKit }>(
      `/users/me/qr-kits/${id}`,
      data,
    )
    return response.data
  },


}

// Hooks
export const useQRCodeSVG = (url: string | null | undefined) => {
  return useQuery({
    queryKey: ['qr-code-svg', url],
    queryFn: async () => {
      if (!url) throw new Error('SVG URL is required')
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch QR code SVG')
      }
      return response.text()
    },
    enabled: !!url,
  })
}

export const useMerchantBySerial = (serialNumber: string | null) => {
  const identity = useAuthStore((s) => s.isAuthenticated && s.user?.fullName?.trim() ? s.user.id : null)
  return useQuery({
    queryKey: ['merchant', serialNumber, identity],
    queryFn: () => {
      if (!serialNumber) throw new Error('Serial number is required')
      return publicQrApi.getMerchantBySerial(serialNumber, Boolean(identity))
    },
    enabled: !!serialNumber,
    retry: false,
  })
}

export const useUserQRKits = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['user', 'qr-kits'],
    queryFn: () => userQrApi.getUserQRKits(),
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export const useUserQRKit = (id: string | null) => {
  return useQuery({
    queryKey: ['user', 'qr-kit', id],
    queryFn: () => {
      if (!id) throw new Error('QRKit ID is required')
      return userQrApi.getUserQRKitById(id)
    },
    enabled: !!id,
    retry: false,
  })
}

export const useUpdateQRKit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { name?: string; collectFeedback?: boolean }
    }) =>
      userQrApi.updateUserQRKit(id, data),
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(['user', 'qr-kit', id], data.qrKit)
      queryClient.invalidateQueries({ queryKey: ['user', 'qr-kits'] })
    },
  })
}

export const useQRAvailability = () => {
  return useQuery({
    queryKey: ['qr-kits', 'availability'],
    queryFn: () => publicQrApi.getAvailability(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}
