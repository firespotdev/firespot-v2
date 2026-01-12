import { useQuery } from '@tanstack/react-query'
import { adminApiClient } from '@/lib/utils/axios'
import type { QRKit, QRKitListResponse, QRKitFilters } from './interface'

// API functions
export const qrKitsApi = {
  getQRKits: async (filters?: QRKitFilters): Promise<QRKitListResponse> => {
    const response = await adminApiClient.get<QRKitListResponse>('/admin/qr-kits', {
      params: filters,
    })
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
