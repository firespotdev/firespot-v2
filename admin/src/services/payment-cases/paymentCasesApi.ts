import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApiClient } from '@/lib/utils/axios'
import type { CustomerReport, DisputeCase, RefundCase } from './interface'

const root = '/admin/payment-cases'

export const paymentCasesApi = {
  refunds: async () =>
    (await adminApiClient.get<RefundCase[]>(`${root}/refunds`)).data,
  disputes: async () =>
    (await adminApiClient.get<DisputeCase[]>(`${root}/disputes`)).data,
  reports: async () =>
    (await adminApiClient.get<CustomerReport[]>(`${root}/reports`)).data,
  approveRefund: async (id: string) =>
    (await adminApiClient.post(`${root}/refunds/${id}/approve`, {})).data,
  rejectRefund: async (id: string, reason?: string) =>
    (await adminApiClient.post(`${root}/refunds/${id}/reject`, { reason })).data,
  remindMerchant: async (id: string) =>
    (await adminApiClient.post(`${root}/disputes/${id}/remind`)).data,
  acceptDispute: async (id: string, message: string) =>
    (await adminApiClient.post(`${root}/disputes/${id}/accept`, { message })).data,
  addDisputeNote: async (id: string, note: string) =>
    (await adminApiClient.post(`${root}/disputes/${id}/notes`, { note })).data,
  updateReport: async (
    id: string,
    status: CustomerReport['status'],
    note?: string,
  ) =>
    (
      await adminApiClient.post(`${root}/reports/${id}/status`, {
        status,
        note,
      })
    ).data,
}

export const usePaymentCases = () => ({
  refunds: useQuery({ queryKey: ['payment-cases', 'refunds'], queryFn: paymentCasesApi.refunds }),
  disputes: useQuery({ queryKey: ['payment-cases', 'disputes'], queryFn: paymentCasesApi.disputes }),
  reports: useQuery({ queryKey: ['payment-cases', 'reports'], queryFn: paymentCasesApi.reports }),
})

export const usePaymentCaseAction = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-cases'] }),
  })
}

