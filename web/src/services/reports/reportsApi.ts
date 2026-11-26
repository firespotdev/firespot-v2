import { apiClient } from '@/lib/utils/axios'
import type {
  CreateReportPayload,
  ReportDetails,
  ReportSaleContext,
} from './interface'

export const reportsApi = {
  submit: async (payload: CreateReportPayload): Promise<{ _id: string }> => {
    const formData = new FormData()
    formData.append('saleId', payload.saleId)
    formData.append('category', payload.category)
    formData.append('description', payload.description)
    if (payload.proof) formData.append('proof', payload.proof)
    const { data } = await apiClient.post('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  saleContext: async (saleId: string): Promise<ReportSaleContext> =>
    (await apiClient.get(`/reports/sale/${saleId}`)).data,

  get: async (id: string): Promise<ReportDetails> =>
    (await apiClient.get(`/reports/${id}`)).data,

  followUp: async (id: string): Promise<ReportDetails> =>
    (await apiClient.post(`/reports/${id}/follow-up`)).data,

  close: async (id: string): Promise<ReportDetails> =>
    (await apiClient.post(`/reports/${id}/close`)).data,
}
