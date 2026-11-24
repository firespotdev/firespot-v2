'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from '@bprogress/next/app'
import {
  SERVER_UNREACHABLE_MESSAGE,
  useAuthStore,
  useAuthReady,
  useWaitingForServer,
} from '@/services/auth'
import { hasPersonalIdentity, isTokenExpired } from '@/lib/utils/auth-redirect'
import { BottomNav } from '@/components/layout/bottom-nav'
import { LoadingPage } from '@/components/layout/LoadingPage'

/**
 * Personal (consumer) zone. Available to any signed-in, onboarded user —
 * both personal-only accounts and merchants (who also have a personal side).
 * Renders the shared personal bottom nav for every page in the group.
 */
export default function PersonalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const ready = useAuthReady()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const token = useAuthStore((s) => s.token)
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const waitingForServer = useWaitingForServer()

  useEffect(() => {
    if (!ready || waitingForServer) return
    if (!isAuthenticated || !token || isTokenExpired(token)) {
      if (token && isTokenExpired(token)) logout()
      router.replace('/login')
      return
    }
    if (!onboardingCompleted) {
      router.replace('/onboarding')
      return
    }
    if (!hasPersonalIdentity(user)) {
      router.replace(`/onboarding?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [ready, waitingForServer, isAuthenticated, token, onboardingCompleted, user, pathname, router, logout])

  if (waitingForServer) {
    return <LoadingPage message={SERVER_UNREACHABLE_MESSAGE} innerBg="#ffffff" />
  }

  if (!ready) {
    return <div className="h-dvh bg-white" />
  }

  return (
    <>
      {children}
      {/* Business profiles and item pages have their own bottom bars. */}
      {!pathname.startsWith('/business') && <BottomNav variant="light" />}
    </>
  )
}
