'use client'

import { create } from 'zustand'
import { refreshAccessToken } from '@/lib/utils/axios'
import { isTokenExpired } from '@/lib/utils/auth-redirect'
import { useAuthStore } from './authSlice'

const RETRY_MS = 5000

/** Shown in place of a page while an expired login waits for the server. */
export const SERVER_UNREACHABLE_MESSAGE = "Can't reach Firespot. Retrying…"

interface SessionReachabilityState {
  /** The login needs renewing but the server couldn't be reached to do it. */
  unreachable: boolean
}

const useSessionReachabilityStore = create<SessionReachabilityState>(() => ({
  unreachable: false,
}))

let retryTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRetry() {
  if (retryTimer) return
  retryTimer = setTimeout(async () => {
    retryTimer = null
    const refresh = await refreshAccessToken()
    if (refresh.status === 'unavailable') {
      scheduleRetry()
      return
    }
    if (refresh.status === 'expired') useAuthStore.getState().logout()
    useSessionReachabilityStore.setState({ unreachable: false })
  }, RETRY_MS)
}

/**
 * Keep the saved login while the server is down and try renewing it again
 * until the server answers: a new token resumes the session, a refusal ends it.
 */
export function markSessionUnreachable() {
  useSessionReachabilityStore.setState({ unreachable: true })
  scheduleRetry()
}

/**
 * True while an expired login is waiting for the server to come back.
 * Guards show a waiting screen then, instead of logging the user out.
 */
export function useWaitingForServer(): boolean {
  const unreachable = useSessionReachabilityStore((s) => s.unreachable)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const token = useAuthStore((s) => s.token)
  return unreachable && isAuthenticated && !!token && isTokenExpired(token)
}
