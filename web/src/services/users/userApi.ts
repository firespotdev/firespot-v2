'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import { safeSessionStorage } from '@/lib/utils/storage'
import { useAuthStore } from '@/services/auth/authSlice'
import type {
  UserProfile,
  QRKitActivationResponse,
  UpdateProfilePhotoResponse,
  UpdateBusinessImageResponse,
  UpdateProfileBannerResponse,
  SerialCheckResponse,
  PaymentVerificationResponse,
  BankAccount,
  CurrentLocationResponse,
  UpdateCurrentLocationPayload,
} from './interface'

export interface AddBankAccountDto {
  bankName: string
  bankCode: string
  accountNumber: string
}

export interface AddBankAccountResponse {
  message: string
  bankAccount: BankAccount
}

export interface BankAccountsResponse {
  bankAccounts: BankAccount[]
}

export interface SetPrimaryResponse {
  message: string
  bankAccount: BankAccount
}

export interface DeleteBankAccountResponse {
  message: string
}

export interface PaymentSettings {
  savedCardsCheckoutEnabled?: boolean
  paystackCollectionEnabled?: boolean
  bankTransferEnabled?: boolean
  paystackCollectionChannels?: string[]
}

const CURRENT_LOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface CachedCurrentLocation {
  expiresAt: number
  data: CurrentLocationResponse
}

const currentLocationCacheKey = (userId: string) =>
  `firespot:current-location:${userId}`

const readCachedCurrentLocation = (
  userId: string,
  persistedCoordinates?: [number, number],
) => {
  const key = currentLocationCacheKey(userId)
  const raw = safeSessionStorage.getItem(key)
  if (!raw) return null

  try {
    const cached = JSON.parse(raw) as CachedCurrentLocation
    const location = cached.data?.location
    const isValidLocation =
      location !== null &&
      typeof location === 'object' &&
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number' &&
      typeof location.label === 'string' &&
      location.attribution === 'Google Maps'
    const coordinatesMatch =
      !persistedCoordinates ||
      (location?.longitude === persistedCoordinates[0] &&
        location.latitude === persistedCoordinates[1])
    if (
      typeof cached.expiresAt !== 'number' ||
      cached.expiresAt <= Date.now() ||
      !isValidLocation ||
      !coordinatesMatch
    ) {
      safeSessionStorage.removeItem(key)
      return null
    }
    return cached
  } catch {
    safeSessionStorage.removeItem(key)
    return null
  }
}

const cacheCurrentLocation = (
  userId: string,
  data: CurrentLocationResponse,
) => {
  if (!data.location) {
    safeSessionStorage.removeItem(currentLocationCacheKey(userId))
    return
  }
  const cached: CachedCurrentLocation = {
    expiresAt: Date.now() + CURRENT_LOCATION_CACHE_TTL_MS,
    data,
  }
  safeSessionStorage.setItem(
    currentLocationCacheKey(userId),
    JSON.stringify(cached),
  )
}

// API functions
export const userApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/users/me')
    return response.data
  },

  getCurrentLocation: async (): Promise<CurrentLocationResponse> => {
    const response = await apiClient.get<CurrentLocationResponse>(
      '/users/me/current-location',
    )
    return response.data
  },

  updateCurrentLocation: async (
    payload: UpdateCurrentLocationPayload,
  ): Promise<CurrentLocationResponse> => {
    const response = await apiClient.patch<CurrentLocationResponse>(
      '/users/me/current-location',
      payload,
    )
    return response.data
  },

  updatePaymentSettings: async (
    settings: PaymentSettings,
  ): Promise<{
    message: string
    savedCardsCheckoutEnabled: boolean
    paystackCollectionEnabled: boolean
    bankTransferEnabled: boolean
    paystackCollectionChannels: string[]
  }> => {
    const response = await apiClient.patch(
      '/users/me/payment-settings',
      settings,
    )
    return response.data
  },

  checkSerialNumber: async (
    serialNumber: string,
  ): Promise<SerialCheckResponse> => {
    const response = await apiClient.get<SerialCheckResponse>(
      `/qr-kits/${serialNumber}/check`,
    )
    return response.data
  },

  initiateActivation: async (
    serialNumber: string,
  ): Promise<QRKitActivationResponse> => {
    const response = await apiClient.post<QRKitActivationResponse>(
      `/qr-kits/${serialNumber}/activate`,
    )
    return response.data
  },

  verifyPayment: async (
    reference: string,
  ): Promise<PaymentVerificationResponse> => {
    const response = await apiClient.get<PaymentVerificationResponse>(
      `/qr-kits/verify-payment/${reference}`,
    )
    return response.data
  },

  updateProfilePhoto: async (
    file: File,
  ): Promise<UpdateProfilePhotoResponse> => {
    const formData = new FormData()
    formData.append('photo', file)

    const response = await apiClient.patch<UpdateProfilePhotoResponse>(
      '/users/photo',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )
    return response.data
  },

  updateBusinessImage: async (
    file: File,
  ): Promise<UpdateBusinessImageResponse> => {
    const formData = new FormData()
    formData.append('businessImage', file)

    const response = await apiClient.patch<UpdateBusinessImageResponse>(
      '/users/business-image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )
    return response.data
  },

  updateProfileBanner: async (
    file: File,
  ): Promise<UpdateProfileBannerResponse> => {
    const formData = new FormData()
    formData.append('banner', file)

    const response = await apiClient.patch<UpdateProfileBannerResponse>(
      '/users/banner',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data
  },

  // Bank account management
  getBankAccounts: async (): Promise<BankAccountsResponse> => {
    const response = await apiClient.get<BankAccountsResponse>(
      '/users/bank-accounts',
    )
    return response.data
  },

  addBankAccount: async (
    dto: AddBankAccountDto,
  ): Promise<AddBankAccountResponse> => {
    const response = await apiClient.post<AddBankAccountResponse>(
      '/users/bank-accounts',
      dto,
    )
    return response.data
  },

  setPrimaryBankAccount: async (
    accountNumber: string,
  ): Promise<SetPrimaryResponse> => {
    const response = await apiClient.patch<SetPrimaryResponse>(
      `/users/bank-accounts/${accountNumber}/primary`,
    )
    return response.data
  },

  setBankAccountEnabled: async ({
    accountNumber,
    enabled,
  }: {
    accountNumber: string
    enabled: boolean
  }): Promise<SetPrimaryResponse> => {
    const response = await apiClient.patch<SetPrimaryResponse>(
      `/users/bank-accounts/${accountNumber}/visibility`,
      { enabled },
    )
    return response.data
  },

  deleteBankAccount: async (
    accountNumber: string,
  ): Promise<DeleteBankAccountResponse> => {
    const response = await apiClient.delete<DeleteBankAccountResponse>(
      `/users/bank-accounts/${accountNumber}`,
    )
    return response.data
  },

  registerFcmToken: async (token: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      '/users/fcm-token',
      { token },
    )
    return response.data
  },

  getIndustries: async (): Promise<{ industries: string[] }> => {
    const response = await apiClient.get<{ industries: string[] }>(
      '/users/industries',
    )
    return response.data
  },
}

// Hooks
export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: userApi.getProfile,
  })
}

export function useCurrentLocation() {
  const user = useAuthStore((state) => state.user)
  const userId = user?.id
  const persistedCoordinates = user?.personalLocation?.coordinates
  const cached = userId
    ? readCachedCurrentLocation(userId, persistedCoordinates)
    : null

  return useQuery({
    queryKey: ['user', 'current-location', userId],
    queryFn: async () => {
      if (!userId) return { location: null }
      const sessionCache = readCachedCurrentLocation(
        userId,
        persistedCoordinates,
      )
      if (sessionCache) return sessionCache.data
      const data = await userApi.getCurrentLocation()
      cacheCurrentLocation(userId, data)
      return data
    },
    enabled: Boolean(userId),
    initialData: cached?.data,
    initialDataUpdatedAt: cached
      ? cached.expiresAt - CURRENT_LOCATION_CACHE_TTL_MS
      : undefined,
    staleTime: CURRENT_LOCATION_CACHE_TTL_MS,
    gcTime: CURRENT_LOCATION_CACHE_TTL_MS,
  })
}

export function useUpdateCurrentLocation() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)

  return useMutation({
    mutationFn: userApi.updateCurrentLocation,
    onSuccess: (data) => {
      if (user?.id) {
        cacheCurrentLocation(user.id, data)
        queryClient.setQueryData(
          ['user', 'current-location', user.id],
          data,
        )
        if (data.location) {
          updateUser({
            ...user,
            personalLocation: {
              type: 'Point',
              coordinates: [
                data.location.longitude,
                data.location.latitude,
              ],
            },
            personalLocationAccuracyMeters: data.location.accuracyMeters,
            personalLocationCapturedAt: data.location.capturedAt,
          })
        }
      }
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.updatePaymentSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['user', 'profile'],
        (profile: UserProfile | undefined) =>
          profile
            ? {
                ...profile,
                savedCardsCheckoutEnabled:
                  data.savedCardsCheckoutEnabled,
                paystackCollectionEnabled:
                  data.paystackCollectionEnabled,
                bankTransferEnabled: data.bankTransferEnabled,
                paystackCollectionChannels:
                  data.paystackCollectionChannels,
              }
            : profile,
      )
    },
  })
}

export function useIndustries() {
  return useQuery({
    queryKey: ['industries'],
    queryFn: userApi.getIndustries,
    select: (data) => data.industries,
    staleTime: Infinity,
  })
}

export function useCheckSerialNumber() {
  return useMutation({
    mutationFn: userApi.checkSerialNumber,
  })
}

export function useInitiateActivation() {
  return useMutation({
    mutationFn: userApi.initiateActivation,
  })
}

export function useVerifyPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.verifyPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

export function useUpdateProfilePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.updateProfilePhoto,
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['user', 'profile'],
        (oldData: UserProfile | undefined) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            profilePhotoUrl: data.profilePhotoUrl,
          }
        },
      )
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

export function useUpdateBusinessImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.updateBusinessImage,
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['user', 'profile'],
        (oldData: UserProfile | undefined) =>
          oldData
            ? { ...oldData, businessImageUrl: data.businessImageUrl }
            : oldData,
      )
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

export function useUpdateProfileBanner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.updateProfileBanner,
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['user', 'profile'],
        (oldData: UserProfile | undefined) =>
          oldData ? { ...oldData, profileBannerUrl: data.profileBannerUrl } : oldData,
      )
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

// Bank account hooks
export function useBankAccounts() {
  return useQuery({
    queryKey: ['user', 'bank-accounts'],
    queryFn: userApi.getBankAccounts,
  })
}

export function useAddBankAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.addBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

export function useSetPrimaryBankAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.setPrimaryBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

export function useSetBankAccountEnabled() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: userApi.setBankAccountEnabled,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.deleteBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
  })
}
