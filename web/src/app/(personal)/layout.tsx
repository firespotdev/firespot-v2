'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore, useAuthReady } from '@/services/auth'
import { hasPersonalIdentity, isTokenExpired } from '@/lib/utils/auth-redirect'
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
  const pathname = usePathname()
  const ready = useAuthReady()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const token = useAuthStore((s) => s.token)
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted)
  const user = useAuthStore((s) => s.user)
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
      return
    }
    if (!hasPersonalIdentity(user)) {
      router.replace(`/onboarding?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [ready, isAuthenticated, token, onboardingCompleted, user, pathname, router, logout])

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
