'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OtpVerification } from '@/components/auth/otp-verification'
import { SignupForm } from '@/components/auth/signup-form'
import { useSignup, useVerifyOtp, useAuthStore } from '@/services/auth'

function SignupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get redirect params (must be before useState so we can use them as initial values)
  const redirectPath = searchParams.get('redirect')
  const serialNumber = searchParams.get('serial')
  const prefillPhone = searchParams.get('phone') ?? ''

  const [step, setStep] = useState<1 | 2>(1)
  const [phoneNumber, setPhoneNumber] = useState(prefillPhone)
  const [selectedBankCode, setSelectedBankCode] = useState<string>('')
  const [selectedBankName, setSelectedBankName] = useState<string>('')
  const [accountNumber, setAccountNumber] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [signupError, setSignupError] = useState<string | undefined>()
  const [otpError, setOtpError] = useState<string | undefined>()
  const [accountError, setAccountError] = useState<string | undefined>()
  const [referralError, setReferralError] = useState<string | undefined>()

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const signup = useSignup()
  const verifyOtp = useVerifyOtp()


  // Build redirect URL after signup
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
    if (isAuthenticated && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          logout()
          return
        }
      } catch (e) {
        logout()
        return
      }
      router.replace(getRedirectUrl())
    }
  }, [isAuthenticated, token, router, logout])

  const handleBankChange = (code: string, name: string) => {
    setSelectedBankCode(code)
    setSelectedBankName(name)
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError(undefined)
    setAccountError(undefined)
    setReferralError(undefined)

    signup.mutate(
      {
        phoneNumber,
        phoneCountryCode: '+234',
        bankName: selectedBankName,
        bankCode: selectedBankCode,
        accountNumber,
        referralCode: referralCode || undefined,
      },
      {
        onSuccess: () => {
          setStep(2)
        },
        onError: (error: any) => {
          const message =
            error?.response?.data?.message ||
            'Failed to create account. Please try again.'

          // Parse error message to determine which field it belongs to
          const lowerMessage = message.toLowerCase()
          if (
            lowerMessage.includes('referral') ||
            lowerMessage.includes('referrer')
          ) {
            setReferralError(message)
          } else if (
            lowerMessage.includes('account') ||
            lowerMessage.includes('bank') ||
            lowerMessage.includes('verify') ||
            lowerMessage.includes('resolve')
          ) {
            setAccountError(message)
          } else {
            setSignupError(message)
          }
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
    signup.mutate(
      {
        phoneNumber,
        phoneCountryCode: '+234',
        bankName: selectedBankName,
        bankCode: selectedBankCode,
        accountNumber,
        referralCode: referralCode || undefined,
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

  // Build login URL with preserved params
  const getLoginUrl = () => {
    const params = new URLSearchParams()
    if (redirectPath) params.set('redirect', redirectPath)
    if (serialNumber) params.set('serial', serialNumber)
    const queryString = params.toString()
    return queryString ? `/login?${queryString}` : '/login'
  }

  // Step 1: Signup Form
  return (
    <SignupForm
      phoneNumber={phoneNumber}
      onPhoneNumberChange={setPhoneNumber}
      selectedBankCode={selectedBankCode}
      selectedBankName={selectedBankName}
      onBankChange={handleBankChange}
      accountNumber={accountNumber}
      onAccountNumberChange={setAccountNumber}
      referralCode={referralCode}
      onReferralCodeChange={setReferralCode}
      onSubmit={handleStep1Submit}
      isLoading={signup.isPending}
      error={signupError}
      accountError={accountError}
      referralError={referralError}
      onAccountErrorChange={setAccountError}
      onReferralErrorChange={setReferralError}
      loginUrl={getLoginUrl()}
    />
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <SignupPageContent />
    </Suspense>
  )
}
