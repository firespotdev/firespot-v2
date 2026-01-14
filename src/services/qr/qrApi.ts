import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApiClient, publicApiClient, apiClient } from '@/lib/utils/axios'
import { getCustomerFingerprint } from '@/lib/utils/customer-fingerprint'
import type {
  QRKit,
  QRKitListResponse,
  QRKitFilters,
  BulkCreateDto,
  QRKitStats,
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
}

export const qrKitsApi = {
  getQRKits: async (filters?: QRKitFilters): Promise<QRKitListResponse> => {
    const response = await adminApiClient.get<QRKitListResponse>(
      '/admin/qr-kits',
      {
        params: filters,
      },
    )
    return response.data
  },

  getQRKitById: async (id: string): Promise<QRKit> => {
    const response = await adminApiClient.get<QRKit>(`/admin/qr-kits/${id}`)
    return response.data
  },

  fetchQRCodeSVG: async (url: string): Promise<string> => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to fetch QR code SVG')
    }
    return response.text()
  },

  createQRKit: async (): Promise<QRKit> => {
    const response = await adminApiClient.post<QRKit>('/admin/qr-kits', {})
    return response.data
  },

  bulkCreateQRKits: async (dto: BulkCreateDto): Promise<QRKit[]> => {
    const response = await adminApiClient.post<QRKit[]>(
      '/admin/qr-kits/bulk',
      dto,
    )
    return response.data
  },

  downloadQRCodePNG: async (id: string): Promise<Blob> => {
    const response = await adminApiClient.get(`/admin/qr-kits/${id}/qr-code`, {
      responseType: 'blob',
    })
    return response.data
  },

  getStats: async (): Promise<QRKitStats> => {
    const response = await adminApiClient.get<QRKitStats>(
      '/admin/qr-kits/stats',
    )
    return response.data
  },
}

// Hooks
export const useQRKits = (filters?: QRKitFilters) => {
  return useQuery({
    queryKey: ['qr-kits', filters],
    queryFn: () => qrKitsApi.getQRKits(filters),
  })
}

export const useQRKit = (id: string | null) => {
  return useQuery({
    queryKey: ['qr-kit', id],
    queryFn: () => {
      if (!id) throw new Error('QRKit ID is required')
      return qrKitsApi.getQRKitById(id)
    },
    enabled: !!id,
  })
}

export const useQRCodeSVG = (url: string | null | undefined) => {
  return useQuery({
    queryKey: ['qr-code-svg', url],
    queryFn: () => {
      if (!url) throw new Error('SVG URL is required')
      return qrKitsApi.fetchQRCodeSVG(url)
    },
    enabled: !!url,
  })
}

export const useQRKitStats = () => {
  return useQuery({
    queryKey: ['qr-kit-stats'],
    queryFn: () => qrKitsApi.getStats(),
  })
}

export const useCreateQRKit = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => qrKitsApi.createQRKit(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-kits'] })
      queryClient.invalidateQueries({ queryKey: ['qr-kit-stats'] })
    },
  })
}

export const useBulkCreateQRKits = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: BulkCreateDto) => qrKitsApi.bulkCreateQRKits(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-kits'] })
      queryClient.invalidateQueries({ queryKey: ['qr-kit-stats'] })
    },
  })
}

export const useDownloadQRCodePNG = () => {
  return useMutation({
    mutationFn: async ({
      id,
      serialNumber,
    }: {
      id: string
      serialNumber: string
    }) => {
      const blob = await qrKitsApi.downloadQRCodePNG(id)

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${serialNumber}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
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

export const useUserQRKits = () => {
  return useQuery({
    queryKey: ['user', 'qr-kits'],
    queryFn: () => userQrApi.getUserQRKits(),
    retry: false,
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
