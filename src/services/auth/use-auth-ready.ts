'use client'

import { useEffect, useState } from 'react'
import { useAuthStore, useAuthHydrated } from './authSlice'
import { refreshAccessToken } from '@/lib/utils/axios'
import { isTokenExpired } from '@/lib/utils/auth-redirect'

/**
 * Gate for auth guards. Resolves once the persisted store has hydrated AND —
 * if we hold an expired access token but may still have a valid refresh
 * cookie — a one-time silent refresh has been attempted. Without this, the
 * short (15-min) access-token lifetime would log returning users out on load
 * before the refresh cookie ever gets a chance to mint a new token.
 */
export function useAuthReady(): boolean {
  const hydrated = useAuthHydrated()
  const [bootstrapped, setBootstrapped] = useState(false)

  useEffect(() => {
    if (!hydrated || bootstrapped) return

    const { isAuthenticated, token, logout } = useAuthStore.getState()

    // Expired access token + we think we're logged in → try the refresh cookie
    if (isAuthenticated && token && isTokenExpired(token)) {
      let active = true
      refreshAccessToken().then((newToken) => {
        if (!active) return
        if (!newToken) logout()
        setBootstrapped(true)
      })
      return () => {
        active = false
      }
    }

    setBootstrapped(true)
  }, [hydrated, bootstrapped])

  return hydrated && bootstrapped
}
