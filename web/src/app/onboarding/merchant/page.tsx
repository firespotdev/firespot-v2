'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { BusinessAboutForm } from '@/components/auth/business-about-form'
import { BusinessPaymentsForm } from '@/components/auth/business-payments-form'
import { useMerchantSetup, useAuthStore, useAuthReady } from '@/services/auth'
import { useInitiateActivation } from '@/services/users'
import { showNotificationToast } from '@/components/ui'

type Step = 'about' | 'payments'

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

function readMerchantOnboardingDraft(): MerchantOnboardingDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const savedDraft = sessionStorage.getItem(DRAFT_KEY)
    return savedDraft ? JSON.parse(savedDraft) : null
  } catch {
    return null
  }
}

function MerchantOnboardingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Deep link back to where the user came from (e.g. QR kit activation)
  const redirectPath = searchParams.get('redirect')
  // Agent referral from QR kit links — applied silently, no visible field
  const referralCode = searchParams.get('ref')?.toUpperCase()
  const merchantReferralCode = searchParams.get('mref')?.toUpperCase()
  const hasDraft = searchParams.get('draft') === '1'

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
  const [draft] = useState<MerchantOnboardingDraft | null>(() =>
    hasDraft ? readMerchantOnboardingDraft() : null,
  )

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const merchantSetup = useMerchantSetup()
  const initiateActivation = useInitiateActivation()
  const hydrated = useAuthReady()

  // Guard: must be authenticated; existing merchants have nothing to set up
  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (user?.role === 'merchant' && !hasDraft) {
      router.replace(redirectPath || '/profile')
    }
  }, [hydrated, isAuthenticated, user, router, redirectPath, hasDraft])

  useEffect(() => {
    if (hasDraft && !draft) router.replace('/onboarding/merchant/start')
  }, [hasDraft, draft, router])

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

    if (!hasDraft || !draft) {
      setStep('payments')
      return
    }

    merchantSetup.mutate(
      {
        businessName: businessName.trim(),
        industry,
        description: description.trim(),
        bankName: draft.bankName,
        bankCode: draft.bankCode,
        accountNumber: draft.accountNumber,
        referralCode: draft.referralCode || referralCode || undefined,
        merchantReferralCode:
          draft.merchantReferralCode || merchantReferralCode || undefined,
      },
      {
        onSuccess: () => {
          sessionStorage.removeItem(DRAFT_KEY)
          if (!draft.serialNumber) {
            router.replace('/profile')
            return
          }
          initiateActivation.mutate(draft.serialNumber, {
            onSuccess: (activation) => {
              if (activation.isAutoActivated || !activation.authorizationUrl) {
                showNotificationToast({
                  message: activation.message || 'QR kit activated!',
                  mode: 'success',
                })
                router.replace('/profile')
                return
              }
              window.location.href = activation.authorizationUrl
            },
            onError: (activationError: unknown) => {
              const apiError = activationError as ApiError
              setError(
                apiError.response?.data?.message ||
                  'Your shop was set up, but we could not start QR kit activation.',
              )
            },
          })
        },
        onError: (setupError: unknown) => {
          const apiError = setupError as ApiError
          setAboutError(
            apiError.response?.data?.message ||
              'Failed to set up your business. Please try again.',
          )
        },
      },
    )
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
        merchantReferralCode: merchantReferralCode || undefined,
      },
      {
        onSuccess: () => {
          router.replace(redirectPath || '/profile')
        },
        onError: (err: unknown) => {
          const apiError = err as ApiError
          const message =
            apiError.response?.data?.message ||
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
      disabled={merchantSetup.isPending || initiateActivation.isPending}
      >
        <ArrowLeft className="w-6 h-6 text-black" />
      </button>
      <div className="max-w-125 mx-auto w-full flex-1 min-h-0 pb-4 px-4 flex flex-col font-satoshi">
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
              isPending={
                merchantSetup.isPending || initiateActivation.isPending
              }
              error={aboutError || (hasDraft ? error : undefined)}
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
