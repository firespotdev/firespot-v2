'use client'

import { useEffect } from 'react'
import { useRouter } from '@bprogress/next/app'
import { useAuthReady, useAuthStore } from '@/services/auth'
import { hasPersonalIdentity, isTokenExpired } from '@/lib/utils/auth-redirect'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const ready = useAuthReady()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted)
  const logout = useAuthStore((state) => state.logout)
  const hasSession = isAuthenticated && !!token && !isTokenExpired(token)
  const hasIdentity = user?.role === 'merchant' || hasPersonalIdentity(user)

  useEffect(() => {
    if (!ready) return
    if (!hasSession) {
      if (token && isTokenExpired(token)) logout()
      router.replace('/login?redirect=%2Fsettings')
    } else if (!onboardingCompleted || !hasIdentity) {
      router.replace('/onboarding?redirect=%2Fsettings')
    }
  }, [ready, hasSession, token, logout, onboardingCompleted, hasIdentity, router])

  if (!ready || !hasSession || !onboardingCompleted || !hasIdentity) {
    return <div className="h-dvh bg-[#F4F6F8]" />
  }

  return children
}
