'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type {
  CustomerAction,
  CustomerCartDraft,
  SaveCartDraftPayload,
} from './interface'

const ACTIONS_KEY = ['customer-actions'] as const
const draftKey = (merchantId?: string) => [
  ...ACTIONS_KEY,
  'cart-draft',
  merchantId,
]

export const CustomerActionsApi = {
  list: async (): Promise<{ data: CustomerAction[] }> =>
    (await apiClient.get('/customer-actions')).data,

  getCartDraft: async (
    merchantId: string,
  ): Promise<CustomerCartDraft | null> =>
    (
      await apiClient.get(
        `/customer-actions/cart-drafts/${encodeURIComponent(merchantId)}`,
      )
    ).data,

  saveCartDraft: async (
    merchantId: string,
    payload: SaveCartDraftPayload,
  ): Promise<CustomerCartDraft> =>
    (
      await apiClient.put(
        `/customer-actions/cart-drafts/${encodeURIComponent(merchantId)}`,
        payload,
      )
    ).data,

  deleteCartDraft: async (merchantId: string): Promise<void> => {
    await apiClient.delete(
      `/customer-actions/cart-drafts/${encodeURIComponent(merchantId)}`,
    )
  },
}

export const useCustomerActions = (enabled = true) =>
  useQuery({
    queryKey: ACTIONS_KEY,
    queryFn: CustomerActionsApi.list,
    enabled,
    staleTime: 15_000,
  })

export const useCustomerCartDraft = (
  merchantId?: string,
  enabled = true,
) =>
  useQuery({
    queryKey: draftKey(merchantId),
    queryFn: () => CustomerActionsApi.getCartDraft(merchantId!),
    enabled: enabled && Boolean(merchantId),
  })

export const useSaveCustomerCartDraft = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      merchantId,
      payload,
    }: {
      merchantId: string
      payload: SaveCartDraftPayload
    }) => CustomerActionsApi.saveCartDraft(merchantId, payload),
    onSuccess: (draft, { merchantId }) => {
      queryClient.setQueryData(draftKey(merchantId), draft)
      queryClient.invalidateQueries({ queryKey: ACTIONS_KEY })
    },
  })
}

export const useDeleteCustomerCartDraft = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (merchantId: string) =>
      CustomerActionsApi.deleteCartDraft(merchantId),
    onSuccess: (_, merchantId) => {
      queryClient.setQueryData(draftKey(merchantId), null)
      queryClient.invalidateQueries({ queryKey: ACTIONS_KEY })
    },
  })
}
