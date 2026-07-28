'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { SignupForm } from '@/components/auth/signup-form'
import { OtpVerification } from '@/components/auth/otp-verification'
import { useRequestOtp, useVerifyOtp } from '@/services/auth'

const DRAFT_KEY = 'firespot:merchant-onboarding-draft'

type MerchantOnboardingDraft = {
  phoneNumber: string
  bankName: string
  bankCode: string
  accountNumber: string
  referralCode?: string
  merchantReferralCode?: string
  serialNumber?: string
}

type ApiError = {
  response?: { data?: { message?: string } }
}

function MerchantStartPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [accountError, setAccountError] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [otpError, setOtpError] = useState<string | undefined>()
  const [step, setStep] = useState<'details' | 'otp'>('details')
  const requestOtp = useRequestOtp()
  const verifyOtp = useVerifyOtp()

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(undefined)

    if (phoneNumber.length < 10 || phoneNumber.length > 11) {
      setError('Please enter a valid phone number')
      return
    }
    if (!bankCode || accountNumber.length !== 10) {
      setError('Please select a bank and enter a 10-digit account number')
      return
    }
    if (accountError) return

    const draft: MerchantOnboardingDraft = {
      phoneNumber,
      bankName,
      bankCode,
      accountNumber,
      referralCode: referralCode || undefined,
      merchantReferralCode:
        searchParams.get('mref')?.trim().toUpperCase() || undefined,
      serialNumber: searchParams.get('serial') || undefined,
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))

    requestOtp.mutate(
      {
        phoneNumber,
        phoneCountryCode: '+234',
      },
      {
        onSuccess: () => setStep('otp'),
        onError: (requestError: unknown) => {
          const apiError = requestError as ApiError
          setError(
            apiError.response?.data?.message ||
              'Failed to send OTP. Please try again.',
          )
        },
      },
    )
  }

  const formattedPhoneNumber = phoneNumber
    ? `+234${phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber}`
    : ''

  const handleOtpVerify = (otpCode: string) => {
    setOtpError(undefined)
    verifyOtp.mutate(
      {
        phoneNumber,
        otpCode,
        phoneCountryCode: '+234',
      },
      {
        onSuccess: () => {
          router.push('/onboarding/merchant?draft=1')
        },
        onError: (verificationError: unknown) => {
          const apiError = verificationError as ApiError
          setOtpError(
            apiError.response?.data?.message || 'Invalid or expired OTP',
          )
        },
      },
    )
  }

  const handleOtpResend = () => {
    requestOtp.mutate(
      { phoneNumber, phoneCountryCode: '+234' },
      {
        onError: (requestError: unknown) => {
          const apiError = requestError as ApiError
          setOtpError(
            apiError.response?.data?.message ||
              'Failed to send OTP. Please try again.',
          )
        },
      },
    )
  }

  if (step === 'otp') {
    return (
      <OtpVerification
        phoneNumber={formattedPhoneNumber}
        onVerify={handleOtpVerify}
        onResend={handleOtpResend}
        onBack={() => { setStep('details'); setOtpError(undefined) }}
        isLoading={verifyOtp.isPending}
        error={otpError}
      />
    )
  }

  return (
    <SignupForm
          title="Open a Shop on firespot"
          loginPrompt="Already have an account?"
          loginUrl="/login"
          phoneNumber={phoneNumber}
          onPhoneNumberChange={setPhoneNumber}
          selectedBankCode={bankCode}
          selectedBankName={bankName}
          onBankChange={(code, name) => { setBankCode(code); setBankName(name) }}
          accountNumber={accountNumber}
          onAccountNumberChange={setAccountNumber}
          referralCode={referralCode}
          onReferralCodeChange={setReferralCode}
          onSubmit={handleSubmit}
          isLoading={requestOtp.isPending}
          error={error}
          accountError={accountError}
          onAccountErrorChange={setAccountError}
          onReferralErrorChange={() => undefined}
        />
  )
}

export default function MerchantStartPage() {
  return <Suspense fallback={<div className="min-h-dvh bg-[#F4F6F8]" />}><MerchantStartPageContent /></Suspense>
}
