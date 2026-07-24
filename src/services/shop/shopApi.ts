'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type {
  GoLiveResponse,
  ShopSetupResponse,
  UpdateContactPayload,
  UpdateFulfillmentPayload,
  UpdateLocationPayload,
} from './interface'

export const SHOP_SETUP_KEY = ['shop', 'setup']
const USER_PROFILE_KEY = ['user', 'profile']

export const shopApi = {
  getSetup: async (): Promise<ShopSetupResponse> => {
    const res = await apiClient.get<ShopSetupResponse>('/users/me/shop-setup')
    return res.data
  },
  updateContact: async (payload: UpdateContactPayload) => {
    const res = await apiClient.patch('/users/me/contact', payload)
    return res.data
  },
  updateFulfillment: async (payload: UpdateFulfillmentPayload) => {
    const res = await apiClient.patch('/users/me/fulfillment', payload)
    return res.data
  },
  updateLocation: async (payload: UpdateLocationPayload) => {
    const res = await apiClient.patch('/users/me/location', payload)
    return res.data
  },
  goLive: async (): Promise<GoLiveResponse> => {
    const res = await apiClient.post<GoLiveResponse>('/users/me/shop/go-live')
    return res.data
  },
}

export const useShopSetup = (enabled = true) =>
  useQuery({
    queryKey: SHOP_SETUP_KEY,
    queryFn: shopApi.getSetup,
    enabled,
  })

/** Any setup edit changes both the profile and the checklist counts. */
const useShopMutation = <T>(fn: (payload: T) => Promise<unknown>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOP_SETUP_KEY })
      queryClient.invalidateQueries({ queryKey: USER_PROFILE_KEY })
    },
  })
}

export const useUpdateContact = () =>
  useShopMutation<UpdateContactPayload>(shopApi.updateContact)

export const useUpdateFulfillment = () =>
  useShopMutation<UpdateFulfillmentPayload>(shopApi.updateFulfillment)

export const useUpdateLocation = () =>
  useShopMutation<UpdateLocationPayload>(shopApi.updateLocation)

export const useGoLive = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: shopApi.goLive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOP_SETUP_KEY })
      queryClient.invalidateQueries({ queryKey: USER_PROFILE_KEY })
    },
  })
}
