'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { OtpVerification } from '@/components/auth/otp-verification'
import {
  useRequestOtp,
  useVerifyOtp,
  useAuthStore,
  useAuthReady,
} from '@/services/auth'
import {
  getPostAuthDestination,
  isTokenExpired,
} from '@/lib/utils/auth-redirect'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<1 | 2>(1)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loginError, setLoginError] = useState<string | undefined>()
  const [otpError, setOtpError] = useState<string | undefined>()

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const onboardingCompleted = useAuthStore(
    (state) => state.onboardingCompleted,
  )
  const logout = useAuthStore((state) => state.logout)
  const authReady = useAuthReady()
  const requestOtp = useRequestOtp()
  const verifyOtp = useVerifyOtp()

  // Get redirect params
  const redirectPath = searchParams.get('redirect')
  const serialNumber = searchParams.get('serial')
  // 'merchant' intent (QR kit claim / old signup links) skips personal onboarding
  const intent = searchParams.get('intent')
  const referralCode = searchParams.get('ref')

  // Build deep-link redirect (e.g. /pay?serial=XYZ) if present
  const getDeepLinkRedirect = () => {
    if (!redirectPath) return null
    const url = new URL(redirectPath, window.location.origin)
    if (serialNumber) {
      url.searchParams.set('serial', serialNumber)
    }
    return url.pathname + url.search
  }

  // Redirect if already authenticated (after the bootstrap refresh settles)
  useEffect(() => {
    if (!authReady) return
    if (isAuthenticated && token) {
      if (isTokenExpired(token)) {
        logout()
        return
      }
      router.replace(
        getPostAuthDestination({
          user,
          onboardingCompleted,
          redirectPath: getDeepLinkRedirect(),
          intent,
          referralCode,
        }),
      )
    }
  }, [authReady, isAuthenticated, token, router, logout])

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value)
    if (loginError) {
      setLoginError(undefined)
    }
  }

  const sendOtp = (onError: (message: string) => void, onSuccess?: () => void) => {
    requestOtp.mutate(
      {
        phoneNumber,
        phoneCountryCode: '+234',
      },
      {
        onSuccess,
        onError: (error: any) => {
          const message =
            error?.response?.data?.message ||
            'Failed to send OTP. Please try again.'
          onError(message)
        },
      },
    )
  }

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(undefined)
    sendOtp(setLoginError, () => setStep(2))
  }

  const handleOtpVerify = (otp: string) => {
    setOtpError(undefined)

    verifyOtp.mutate(
      {
        phoneNumber,
        otpCode: otp,
        phoneCountryCode: '+234',
      },
      {
        onSuccess: (data) => {
          router.push(
            getPostAuthDestination({
              user: data.user,
              onboardingCompleted: data.onboardingCompleted,
              redirectPath: getDeepLinkRedirect(),
              intent,
              referralCode,
            }),
          )
        },
        onError: (error: any) => {
          const message =
            error?.response?.data?.message || 'Invalid or expired OTP'
          setOtpError(message)
        },
      },
    )
  }

  const handleOtpResend = () => {
    sendOtp(setOtpError)
  }

  const handleBack = () => {
    setStep(1)
    setOtpError(undefined)
  }

  // Format phone number for display (e.g., +2348179542786)
  const formattedPhoneNumber = phoneNumber
    ? `+234${phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber}`
    : ''

  // Step 2: OTP Verification
  if (step === 2) {
    return (
      <OtpVerification
        phoneNumber={formattedPhoneNumber}
        onVerify={handleOtpVerify}
        onResend={handleOtpResend}
        onBack={handleBack}
        isLoading={verifyOtp.isPending}
        error={otpError}
      />
    )
  }

  // Step 1: Phone number entry (unified login/signup)
  return (
    <LoginForm
      phoneNumber={phoneNumber}
      onPhoneNumberChange={handlePhoneNumberChange}
      onSubmit={handleLoginSubmit}
      isLoading={requestOtp.isPending}
      error={loginError}
    />
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <LoginPageContent />
    </Suspense>
  )
}
