'use client'

import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import { useAuthStore } from './authSlice'
import type {
  LoginPayload,
  LoginResponse,
  MerchantSetupPayload,
  MerchantSetupResponse,
  RequestOtpPayload,
  RequestOtpResponse,
  SignupPayload,
  SignupResponse,
  UpdateProfilePayload,
  UpdateProfileResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
} from './interface'

// API functions
export const authApi = {
  requestOtp: async (
    payload: RequestOtpPayload,
  ): Promise<RequestOtpResponse> => {
    const response = await apiClient.post<RequestOtpResponse>(
      '/auth/request-otp',
      payload,
    )
    return response.data
  },

  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', payload)
    return response.data
  },

  signup: async (payload: SignupPayload): Promise<SignupResponse> => {
    const response = await apiClient.post<SignupResponse>(
      '/auth/signup',
      payload,
    )
    return response.data
  },

  customerSignup: async (payload: { phoneNumber: string; phoneCountryCode: string }): Promise<SignupResponse> => {
    const response = await apiClient.post<SignupResponse>(
      '/auth/customer/signup',
      payload,
    )
    return response.data
  },

  verifyOtp: async (payload: VerifyOtpPayload): Promise<VerifyOtpResponse> => {
    const response = await apiClient.post<VerifyOtpResponse>(
      '/auth/verify-otp',
      payload,
    )
    return response.data
  },

  updateProfile: async (
    payload: UpdateProfilePayload,
  ): Promise<UpdateProfileResponse> => {
    const response = await apiClient.patch<UpdateProfileResponse>(
      '/users/me/profile',
      payload,
    )
    return response.data
  },

  merchantSetup: async (
    payload: MerchantSetupPayload,
  ): Promise<MerchantSetupResponse> => {
    const response = await apiClient.post<MerchantSetupResponse>(
      '/users/me/merchant-setup',
      payload,
    )
    return response.data
  },

  // Revokes the refresh token server-side and clears the refresh cookie.
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Best-effort: local state is cleared regardless.
    }
  },
}

/**
 * Full logout: revoke the server-side refresh token, then clear local state.
 */
export async function logoutEverywhere(): Promise<void> {
  await authApi.logout()
  useAuthStore.getState().logout()
}

// Hooks
export function useRequestOtp() {
  return useMutation({
    mutationFn: authApi.requestOtp,
  })
}

export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
  })
}

export function useSignup() {
  return useMutation({
    mutationFn: authApi.signup,
  })
}

export function useCustomerSignup() {
  return useMutation({
    mutationFn: authApi.customerSignup,
  })
}

export function useVerifyOtp() {
  const setAuth = useAuthStore((state) => state.setAuth)

  return useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.onboardingCompleted)
    },
  })
}

export function useUpdateProfile() {
  const setUser = useAuthStore((state) => state.setUser)
  const setOnboardingCompleted = useAuthStore(
    (state) => state.setOnboardingCompleted,
  )

  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      setUser(data.user)
      setOnboardingCompleted(true)
    },
  })
}

export function useMerchantSetup() {
  const setUser = useAuthStore((state) => state.setUser)
  const setOnboardingCompleted = useAuthStore(
    (state) => state.setOnboardingCompleted,
  )

  return useMutation({
    mutationFn: authApi.merchantSetup,
    onSuccess: (data) => {
      setUser(data.user)
      setOnboardingCompleted(true)
    },
  })
}
