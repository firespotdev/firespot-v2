'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useAuthReady } from '@/services/auth'
import { isTokenExpired } from '@/lib/utils/auth-redirect'
import { BottomNav } from '@/components/layout/bottom-nav'

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
  const ready = useAuthReady()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const token = useAuthStore((s) => s.token)
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (!ready) return
    if (!isAuthenticated || !token || isTokenExpired(token)) {
      if (token && isTokenExpired(token)) logout()
      router.replace('/login')
      return
    }
    if (!onboardingCompleted) {
      router.replace('/onboarding')
    }
  }, [ready, isAuthenticated, token, onboardingCompleted, router, logout])

  if (!ready) {
    return <div className="h-dvh bg-white" />
  }

  return (
    <>
      {children}
      <BottomNav variant="light" />
    </>
  )
}
