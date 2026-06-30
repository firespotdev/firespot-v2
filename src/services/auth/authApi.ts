'use client'

import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'
import { useAuthStore } from './authSlice'
import type {
  LoginPayload,
  LoginResponse,
  SignupPayload,
  SignupResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
} from './interface'

// API functions
export const authApi = {
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
}

// Hooks
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
      setAuth(data.user, data.accessToken)
    },
  })
}
