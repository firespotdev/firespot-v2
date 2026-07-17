'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { BusinessAboutForm } from '@/components/auth/business-about-form'
import { BusinessPaymentsForm } from '@/components/auth/business-payments-form'
import { useMerchantSetup, useAuthStore, useAuthReady } from '@/services/auth'

type Step = 'about' | 'payments'

function MerchantOnboardingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Deep link back to where the user came from (e.g. QR kit activation)
  const redirectPath = searchParams.get('redirect')
  // Agent referral from QR kit links — applied silently, no visible field
  const referralCode = searchParams.get('ref')?.toUpperCase()

  const [step, setStep] = useState<Step>('about')
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [description, setDescription] = useState('')
  const [selectedBankCode, setSelectedBankCode] = useState('')
  const [selectedBankName, setSelectedBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [aboutError, setAboutError] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [accountError, setAccountError] = useState<string | undefined>()

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const merchantSetup = useMerchantSetup()
  const hydrated = useAuthReady()

  // Guard: must be authenticated; existing merchants have nothing to set up
  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (user?.role === 'merchant') {
      router.replace(redirectPath || '/profile')
    }
  }, [hydrated, isAuthenticated, user, router, redirectPath])

  const handleBack = () => {
    if (step === 'payments') {
      setStep('about')
      setError(undefined)
    } else {
      router.back()
    }
  }

  const handleAboutSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAboutError(undefined)

    if (!businessName.trim()) {
      setAboutError('Please enter your business name')
      return
    }
    if (!industry) {
      setAboutError('Please select your industry')
      return
    }
    if (!description.trim()) {
      setAboutError('Please enter a brief description of your business')
      return
    }

    setStep('payments')
  }

  const handlePaymentsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)
    setAccountError(undefined)

    if (!selectedBankCode || accountNumber.length !== 10) {
      setError('Please select a bank and enter a 10-digit account number')
      return
    }

    merchantSetup.mutate(
      {
        businessName: businessName.trim(),
        industry,
        description: description.trim(),
        bankName: selectedBankName,
        bankCode: selectedBankCode,
        accountNumber,
        referralCode: referralCode || undefined,
      },
      {
        onSuccess: () => {
          router.replace(redirectPath || '/profile')
        },
        onError: (err: any) => {
          const message =
            err?.response?.data?.message ||
            'Failed to set up your business. Please try again.'

          const lowerMessage = message.toLowerCase()
          if (
            lowerMessage.includes('account') ||
            lowerMessage.includes('bank') ||
            lowerMessage.includes('verify') ||
            lowerMessage.includes('resolve')
          ) {
            setAccountError(message)
          } else {
            setError(message)
          }
        },
      },
    )
  }

  return (
    <div
      className="h-dvh flex flex-col"
      style={{
        backgroundColor: step === 'about' ? '#FFFFFF' : '#F4F6F8',
      }}
    >
      <button
        onClick={handleBack}
        className="self-start h-[52px] w-full px-4 shrink-0"
        type="button"
        disabled={merchantSetup.isPending}
      >
        <ArrowLeft className="w-6 h-6 text-black" />
      </button>
      <div className="max-w-[500px] mx-auto w-full flex-1 min-h-0 pb-4 px-4 flex flex-col font-satoshi">
        {step === 'about' ? (
          <>
            <h1 className="font-bold text-[20px] text-black mb-6 mt-2">
              About your business
            </h1>
            <BusinessAboutForm
              businessName={businessName}
              onBusinessNameChange={setBusinessName}
              industry={industry}
              onIndustryChange={setIndustry}
              description={description}
              onDescriptionChange={setDescription}
              onSubmit={handleAboutSubmit}
              error={aboutError}
            />
          </>
        ) : (
          <>
            <h1 className="font-bold text-[20px] text-black mb-3">
              Activate payments
            </h1>
            <p className="text-sm font-medium text-[#00000080] mb-6 max-w-[345px]">
              This is where money you collect via firespot would be settled
              into. Business bank accounts are encouraged.
            </p>
            <BusinessPaymentsForm
              selectedBankCode={selectedBankCode}
              selectedBankName={selectedBankName}
              onBankChange={(code, name) => {
                setSelectedBankCode(code)
                setSelectedBankName(name)
              }}
              accountNumber={accountNumber}
              onAccountNumberChange={setAccountNumber}
              onSubmit={handlePaymentsSubmit}
              isLoading={merchantSetup.isPending}
              error={error}
              accountError={accountError}
              onAccountErrorChange={setAccountError}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default function MerchantOnboardingPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <MerchantOnboardingPageContent />
    </Suspense>
  )
}
