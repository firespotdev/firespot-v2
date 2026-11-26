import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { reportsApi } from './reportsApi'
import type { CreateReportPayload, ReportDetails } from './interface'

const reportKeys = {
  all: ['reports'] as const,
  sale: (saleId: string) => ['reports', 'sale', saleId] as const,
  one: (id: string) => ['reports', 'one', id] as const,
}

/** The sale behind a report, and whether it can be reported now. */
export const useReportSaleContext = (saleId?: string) =>
  useQuery({
    queryKey: reportKeys.sale(saleId ?? ''),
    queryFn: () => reportsApi.saleContext(saleId!),
    enabled: Boolean(saleId),
  })

/** Warm the same per-sale cache used by the activity options drawer. */
export const useReportSaleContexts = (saleIds: string[]) =>
  useQueries({
    queries: saleIds.map((saleId) => ({
      queryKey: reportKeys.sale(saleId),
      queryFn: () => reportsApi.saleContext(saleId),
    })),
  })

export const useReport = (id?: string) =>
  useQuery({
    queryKey: reportKeys.one(id ?? ''),
    queryFn: () => reportsApi.get(id!),
    enabled: Boolean(id),
  })

export const useSubmitReport = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateReportPayload) => reportsApi.submit(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  })
}

/** Follow up or close: both return the updated report. */
const useReportAction = (action: (id: string) => Promise<ReportDetails>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: (report) => {
      queryClient.setQueryData(reportKeys.one(report._id), report)
      void queryClient.invalidateQueries({ queryKey: reportKeys.all })
    },
  })
}

export const useFollowUpReport = () => useReportAction(reportsApi.followUp)
export const useCloseReport = () => useReportAction(reportsApi.close)
