'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import type {
  UserProfile,
  QRKitActivationResponse,
  UpdateProfilePhotoResponse,
  SerialCheckResponse,
  PaymentVerificationResponse,
  BankAccount,
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

// API functions
export const userApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/users/me')
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
