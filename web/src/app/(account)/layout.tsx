'use client'

import { useEffect } from 'react'
import { useRouter } from '@bprogress/next/app'
import {
  SERVER_UNREACHABLE_MESSAGE,
  useAuthReady,
  useAuthStore,
  useWaitingForServer,
} from '@/services/auth'
import { LoadingPage } from '@/components/layout/LoadingPage'
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
  const waitingForServer = useWaitingForServer()

  useEffect(() => {
    if (!ready || waitingForServer) return
    if (!hasSession) {
      if (token && isTokenExpired(token)) logout()
      router.replace('/login?redirect=%2Fsettings')
    } else if (!onboardingCompleted || !hasIdentity) {
      router.replace('/onboarding?redirect=%2Fsettings')
    }
  }, [ready, waitingForServer, hasSession, token, logout, onboardingCompleted, hasIdentity, router])

  if (waitingForServer) {
    return <LoadingPage message={SERVER_UNREACHABLE_MESSAGE} />
  }

  if (!ready || !hasSession || !onboardingCompleted || !hasIdentity) {
    return <div className="h-dvh bg-[#F4F6F8]" />
  }

  return children
}
