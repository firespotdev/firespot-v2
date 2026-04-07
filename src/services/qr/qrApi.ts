import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { publicApiClient, apiClient } from '@/lib/utils/axios'
import { getCustomerFingerprint } from '@/lib/utils/customer-fingerprint'
import type {
  QRKit,
  QRKitListResponse,
  MerchantProfile,
} from './interface'

export const publicQrApi = {
  getMerchantBySerial: async (
    serialNumber: string,
  ): Promise<MerchantProfile> => {
    const fingerprint = getCustomerFingerprint()
    const response = await publicApiClient.get<MerchantProfile>(
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
    data: { name: string },
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
  return useQuery({
    queryKey: ['merchant', serialNumber],
    queryFn: () => {
      if (!serialNumber) throw new Error('Serial number is required')
      return publicQrApi.getMerchantBySerial(serialNumber)
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
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
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

export const useClaimDigitalKit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<{
      message: string
      qrKit: QRKit
    }> => {
      const response = await apiClient.post<{
        message: string
        qrKit: QRKit
      }>('/qr-kits/claim-digital')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'qr-kits'] })
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}
