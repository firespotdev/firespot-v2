import axios from 'axios'
import { useAuthStore } from '@/services/auth/authSlice'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

// User API client — withCredentials so the httpOnly refresh cookie is stored
// (on verify-otp) and sent to /auth/refresh and /auth/logout.
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Single-flight refresh: concurrent 401s share one /auth/refresh call.
let refreshPromise: Promise<string | null> | null = null

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token: string | undefined = res.data?.accessToken
        if (token) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', token)
          }
          useAuthStore.getState().setAccessToken(token)
          return token
        }
        return null
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const url: string = original?.url || ''
    // Never try to refresh the auth endpoints themselves (avoids loops).
    const isAuthEndpoint = url.includes('/auth/')

    if (status === 401 && !isAuthEndpoint && original && !original._retry) {
      original._retry = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient(original)
      }

      // Refresh failed — session is truly gone.
      useAuthStore.getState().logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

// Public API client (no authentication required)
export const publicApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Paystack API client
export const paystackApiClient = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY}`,
    'Content-Type': 'application/json',
  },
})
