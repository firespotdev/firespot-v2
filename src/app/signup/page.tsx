'use client'

import { Suspense, useState } from 'react'
import { OtpVerification } from '@/components/auth/otp-verification'
import { SignupForm } from '@/components/auth/signup-form'

function SignupPageContent() {
  const [step, setStep] = useState<1 | 2>(1)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [selectedBankCode, setSelectedBankCode] = useState<string>('')
  const [selectedBankName, setSelectedBankName] = useState<string>('')
  const [accountNumber, setAccountNumber] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    // Move to step 2
    setStep(2)
    // TODO: Call API to send OTP
  }

  const handleBankChange = (code: string, name: string) => {
    setSelectedBankCode(code)
    setSelectedBankName(name)
  }

  const handleOtpVerify = (otp: string) => {
    setIsVerifyingOtp(true)
    // TODO: Call API to verify OTP
    console.log('Verifying OTP:', otp)
    // Simulate API call
    setTimeout(() => {
      setIsVerifyingOtp(false)
      // On success, navigate to next page or show success
    }, 1000)
  }

  const handleOtpResend = () => {
    // TODO: Call API to resend OTP
    console.log('Resending OTP to:', phoneNumber)
  }

  const handleBack = () => {
    setStep(1)
  }

  // Step 2: OTP Verification
  if (step === 2) {
    return (
      <OtpVerification
        phoneNumber={phoneNumber}
        onVerify={handleOtpVerify}
        onResend={handleOtpResend}
        onBack={handleBack}
        isLoading={isVerifyingOtp}
      />
    )
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
    />
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupPageContent />
    </Suspense>
  )
}
