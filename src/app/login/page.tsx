'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { OtpVerification } from '@/components/auth/otp-verification'
import { useLogin, useVerifyOtp, useAuthStore } from '@/services/auth'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<1 | 2>(1)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loginError, setLoginError] = useState<string | undefined>()
  const [otpError, setOtpError] = useState<string | undefined>()

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const login = useLogin()
  const verifyOtp = useVerifyOtp()

  // Get redirect params
  const redirectPath = searchParams.get('redirect')
  const serialNumber = searchParams.get('serial')

  // Build redirect URL after login
  const getRedirectUrl = () => {
    if (redirectPath) {
      const url = new URL(redirectPath, window.location.origin)
      if (serialNumber) {
        url.searchParams.set('serial', serialNumber)
      }
      return url.pathname + url.search
    }
    return '/profile'
  }

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(getRedirectUrl())
    }
  }, [isAuthenticated, router])

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value)
    if (loginError) {
      setLoginError(undefined)
    }
  }

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(undefined)

    login.mutate(
      {
        phoneNumber,
        phoneCountryCode: '+234',
      },
      {
        onSuccess: () => {
          setStep(2)
        },
        onError: (error: any) => {
          const message =
            error?.response?.data?.message ||
            'Failed to send OTP. Please try again.'
          setLoginError(message)
        },
      },
    )
  }

  const handleOtpVerify = (otp: string) => {
    setOtpError(undefined)

    verifyOtp.mutate(
      {
        phoneNumber,
        otpCode: otp,
      },
      {
        onSuccess: () => {
          router.push(getRedirectUrl())
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
    login.mutate(
      {
        phoneNumber,
        phoneCountryCode: '+234',
      },
      {
        onError: (error: any) => {
          const message =
            error?.response?.data?.message || 'Failed to resend OTP'
          setOtpError(message)
        },
      },
    )
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

  // Build signup URL with preserved params
  const getSignupUrl = () => {
    const params = new URLSearchParams()
    if (redirectPath) params.set('redirect', redirectPath)
    if (serialNumber) params.set('serial', serialNumber)
    const queryString = params.toString()
    return queryString ? `/signup?${queryString}` : '/signup'
  }

  // Step 1: Login Form
  return (
    <LoginForm
      phoneNumber={phoneNumber}
      onPhoneNumberChange={handlePhoneNumberChange}
      onSubmit={handleLoginSubmit}
      isLoading={login.isPending}
      error={loginError}
      signupUrl={getSignupUrl()}
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
