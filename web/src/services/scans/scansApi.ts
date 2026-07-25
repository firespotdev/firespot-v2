import { useMutation, useQuery } from '@tanstack/react-query'
import { publicApiClient, apiClient } from '@/lib/utils/axios'
import type {
  ScanCountResponse,
  RecordCopyResponse,
  MerchantStatsResponse,
} from './interface'

export interface RecordCopyParams {
  serialNumber: string
  accountNumber?: string
  bankName?: string
}

export const scansApi = {
  recordAccountCopy: async (
    params: RecordCopyParams,
  ): Promise<RecordCopyResponse> => {
    const response = await publicApiClient.post<RecordCopyResponse>(
      `/scans/copy/${params.serialNumber}`,
      {
        accountNumber: params.accountNumber,
        bankName: params.bankName,
      },
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
    const response = await apiClient.get<ScanCountResponse>(
      '/scans/merchant/count',
    )
    return response.data
  },

  getMerchantStats: async (): Promise<MerchantStatsResponse> => {
    const response = await apiClient.get<MerchantStatsResponse>(
      '/scans/merchant/stats',
    )
    return response.data
  },
}

export const useRecordAccountCopy = () => {
  return useMutation({
    mutationFn: (params: RecordCopyParams) => scansApi.recordAccountCopy(params),
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

export const useMerchantStats = () => {
  return useQuery({
    queryKey: ['merchant-stats'],
    queryFn: () => scansApi.getMerchantStats(),
    refetchInterval: 1800000, // Refetch every 30 minutes
  })
}
