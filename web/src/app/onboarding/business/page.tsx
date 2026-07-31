'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthReady, useAuthStore } from '@/services/auth'

/**
 * Compatibility entry point for old links. The introduction now opens as a
 * real drawer over the personal home rather than recreating Home as scenery.
 */
export default function BusinessIntroPage() {
  const router = useRouter()
  const ready = useAuthReady()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (!ready) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (user?.role === 'merchant') {
      router.replace('/profile')
      return
    }
    router.replace('/home?businessIntro=1')
  }, [isAuthenticated, ready, router, user?.role])

  return <div className="h-dvh bg-white" />
}
