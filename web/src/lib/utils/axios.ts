import axios from 'axios'
import { useAuthStore } from '@/services/auth/authSlice'
import { safeLocalStorage } from './storage'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const token = safeLocalStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

/**
 * - refreshed: a new access token was issued.
 * - expired: the server refused the refresh cookie; the session is over.
 * - unavailable: the server couldn't answer (network, 5xx). The session may
 *   still be fine, so callers must not log the user out on this.
 */
export type RefreshResult =
  | { status: 'refreshed'; token: string }
  | { status: 'expired' }
  | { status: 'unavailable' }

const SESSION_REFUSED = [401, 403]

// Single-flight refresh: concurrent 401s share one /auth/refresh call.
let refreshPromise: Promise<RefreshResult> | null = null

export function refreshAccessToken(): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res): RefreshResult => {
        const token: string | undefined = res.data?.accessToken
        if (!token) return { status: 'expired' }
        useAuthStore.getState().setAccessToken(token)
        return { status: 'refreshed', token }
      })
      .catch((error): RefreshResult => {
        const status: number | undefined = error?.response?.status
        return status !== undefined && SESSION_REFUSED.includes(status)
          ? { status: 'expired' }
          : { status: 'unavailable' }
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

function sendToLogin() {
  if (
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/pay/')
  ) {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
  }
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
      const refresh = await refreshAccessToken()
      if (refresh.status === 'refreshed') {
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${refresh.token}`
        return apiClient(original)
      }

      // Only a refused refresh ends the session; an outage fails this
      // request but keeps the user signed in.
      if (refresh.status === 'expired') {
        useAuthStore.getState().logout()
        sendToLogin()
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
