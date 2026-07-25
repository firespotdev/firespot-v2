'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useAuthReady } from '@/services/auth'
import { isTokenExpired } from '@/lib/utils/auth-redirect'

/**
 * Merchant (business) zone. Requires an established business — a personal-only
 * account is redirected to /home. This is the single place that keeps
 * personal users out of the business surfaces (dashboard, sales, insights).
 */
export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const ready = useAuthReady()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
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
      return
    }
    // Personal-only accounts have no business to manage here.
    if (user?.role !== 'merchant') {
      router.replace('/home')
    }
  }, [
    ready,
    isAuthenticated,
    token,
    user,
    onboardingCompleted,
    router,
    logout,
  ])

  if (!ready) {
    return <div className="h-dvh bg-[#F4F6F8]" />
  }

  return <>{children}</>
}
