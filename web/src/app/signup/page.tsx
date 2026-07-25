'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Signup has been unified with login (phone + OTP). This page only forwards
 * old links/bookmarks to /login. Signup links were always the merchant entry
 * (QR kit claims, agent referrals), so they carry merchant intent: after OTP
 * these users go straight to business setup, skipping personal onboarding.
 */
function SignupRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams()
    params.set('intent', 'merchant')
    const redirectPath = searchParams.get('redirect')
    const serialNumber = searchParams.get('serial')
    const referralCode =
      searchParams.get('ref') || searchParams.get('referral')
    if (redirectPath) params.set('redirect', redirectPath)
    if (serialNumber) params.set('serial', serialNumber)
    if (referralCode) params.set('ref', referralCode)
    router.replace(`/login?${params.toString()}`)
  }, [router, searchParams])

  return <div className="h-dvh bg-white" />
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <SignupRedirect />
    </Suspense>
  )
}
