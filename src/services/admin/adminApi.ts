import { useMutation } from '@tanstack/react-query'
import { adminApiClient } from '@/lib/utils/axios'
import type {
  AdminLoginDto,
  AdminLoginResponse,
  ChangePasswordDto,
  ChangePasswordResponse,
} from './interface'

// API functions
export const adminAuthApi = {
  login: async (credentials: AdminLoginDto): Promise<AdminLoginResponse> => {
    const response = await adminApiClient.post<AdminLoginResponse>(
      '/admin/auth/login',
      credentials,
    )
    return response.data
  },

  changePassword: async (
    dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponse> => {
    const response = await adminApiClient.patch<ChangePasswordResponse>(
      '/admin/auth/change-password',
      dto,
    )
    return response.data
  },
}

// Hooks
export const useAdminLogin = () => {
  return useMutation({
    mutationFn: (credentials: AdminLoginDto) => adminAuthApi.login(credentials),
    onSuccess: (data) => {
      localStorage.setItem('admin_token', data.accessToken)
      localStorage.setItem('admin_info', JSON.stringify(data.admin))
    },
  })
}

export const useAdminLogout = () => {
  return () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_info')
    window.location.href = '/login'
  }
}

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (dto: ChangePasswordDto) => adminAuthApi.changePassword(dto),
  })
}

// Helpers
export const getAdminToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('admin_token')
}

export const getAdminInfo = () => {
  if (typeof window === 'undefined') return null
  const info = localStorage.getItem('admin_info')
  return info ? JSON.parse(info) : null
}

export const isAdminAuthenticated = (): boolean => {
  return !!getAdminToken()
}
