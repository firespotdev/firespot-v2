import { useMutation, useQuery } from '@tanstack/react-query'
import { publicApiClient, apiClient } from '@/lib/utils/axios'
import type { ScanCountResponse, RecordCopyResponse } from './interface'

export const scansApi = {
  recordAccountCopy: async (serialNumber: string): Promise<RecordCopyResponse> => {
    const response = await publicApiClient.post<RecordCopyResponse>(
      `/scans/copy/${serialNumber}`,
    )
    return response.data
  },

  getScanCountByQRKit: async (qrKitId: string): Promise<ScanCountResponse> => {
    const response = await apiClient.get<ScanCountResponse>(
      `/scans/qr-kit/${qrKitId}/count`,
    )
    return response.data
  },

  getScanCountByMerchant: async (): Promise<ScanCountResponse> => {
    const response = await apiClient.get<ScanCountResponse>('/scans/merchant/count')
    return response.data
  },
}

export const useRecordAccountCopy = () => {
  return useMutation({
    mutationFn: (serialNumber: string) => scansApi.recordAccountCopy(serialNumber),
  })
}

export const useScanCountByQRKit = (qrKitId: string | null) => {
  return useQuery({
    queryKey: ['scan-count', 'qr-kit', qrKitId],
    queryFn: () => {
      if (!qrKitId) throw new Error('QR Kit ID is required')
      return scansApi.getScanCountByQRKit(qrKitId)
    },
    enabled: !!qrKitId,
  })
}

export const useScanCountByMerchant = () => {
  return useQuery({
    queryKey: ['scan-count', 'merchant'],
    queryFn: () => scansApi.getScanCountByMerchant(),
  })
}
