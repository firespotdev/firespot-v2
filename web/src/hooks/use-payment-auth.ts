'use client'

import { useRef } from 'react'
import { useAuthStore, useAuthReady } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'
import { refreshAccessToken } from '@/lib/utils/axios'
import { hasPersonalIdentity, isTokenExpired } from '@/lib/utils/auth-redirect'

/** Keep the payment mounted while phone verification and name entry run. */
export function usePaymentAuth() {
  const ready = useAuthReady()
  const pending = useRef<Promise<boolean> | null>(null)
  return async () => {
    if (!ready) return Promise.resolve(false)
    const { token } = useAuthStore.getState()
    if (token && isTokenExpired(token) && !(await refreshAccessToken()))
      useAuthStore.getState().logout()
    const { isAuthenticated, user } = useAuthStore.getState()
    if (isAuthenticated && hasPersonalIdentity(user))
      return Promise.resolve(true)
    if (pending.current) return pending.current
    pending.current = new Promise<boolean>((resolve) => {
      const settle = (value: boolean) => {
        pending.current = null
        resolve(value)
      }
      useDrawerStore.getState().openDrawer({
        type: isAuthenticated ? 'payment-verify' : 'payment-auth',
        props: {
          initialStep: isAuthenticated ? 'name' : 'phone',
          onComplete: () => settle(true),
          onCancel: () => settle(false),
        },
      })
    })
    return pending.current
  }
}
