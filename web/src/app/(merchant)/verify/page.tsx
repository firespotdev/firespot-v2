'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter } from '@bprogress/next/app'
import { ArrowLeft } from 'lucide-react'
import {
  Button,
  LoaderCircle,
  Spinner,
  TagFooter,
  showNotificationToast,
} from '@/components/ui'
import {
  useKycStatus,
  useCreateKycSession,
  useMarkKycSessionSubmitted,
  useVerifyCac,
  type KycSessionResponse,
} from '@/services/kyc'
import { usePlanCatalog } from '@/services/merchant-plans'
import { SmileIdEmbed } from '@/components/kyc/smileid-embed'
import {
  VerificationStepList,
  buildVerificationRows,
} from '@/components/kyc/verification-step-list'

/** ₦5,000,000 → "₦5m", ₦200,000 → "₦200k". */
function compactNaira(amount: number): string {
  if (amount >= 1_000_000) return `₦${amount / 1_000_000}m`
  if (amount >= 1_000) return `₦${amount / 1_000}k`
  return `₦${amount}`
}

function apiErrorMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || fallback
  )
}

function VerifyContent() {
  const router = useRouter()
  // Poll while incomplete so async SmileID callbacks land without a refresh.
  const { data: status, isLoading, refetch } = useKycStatus(true)
  const { data: catalog } = usePlanCatalog()
  const createSession = useCreateKycSession()
  const markSessionSubmitted = useMarkKycSessionSubmitted()
  const verifyCac = useVerifyCac()

  const [session, setSession] = useState<KycSessionResponse | null>(null)
  const [locallySubmittedCheck, setLocallySubmittedCheck] = useState<
    KycSessionResponse['check'] | null
  >(null)
  const [rcValue, setRcValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="h-dvh bg-white flex items-center justify-center">
        <LoaderCircle />
      </div>
    )
  }

  if (!status?.planTier) {
    return (
      <div className="h-dvh bg-white font-satoshi flex flex-col items-center justify-center px-8 text-center">
        <p className="text-base font-bold text-black">No plan yet</p>
        <p className="text-sm text-[#00000080] mt-1">
          Choose a Firespot Business plan to start verification.
        </p>
        <Button
          onClick={() => router.replace('/plans')}
          className="mt-6 h-12 px-8 rounded-full bg-black text-white font-bold"
        >
          View plans
        </Button>
      </div>
    )
  }

  const { steps, nextStep, nextStepMode, isComplete } = status
  const rows = buildVerificationRows(steps).map((row) =>
    row.sourceKey === locallySubmittedCheck
      ? { ...row, isVerifying: true, isResumable: false }
      : row,
  )
  const isVerificationConfirming = rows.some((row) => row.isVerifying)
  const isResuming = rows.some(
    (row) => row.sourceKey === nextStep?.key && row.isResumable,
  )

  // The cap is what the merchant is unlocking, so it comes from their tier
  // rather than being hardcoded.
  const dailyCap = catalog?.plans.find(
    (p) => p.tier === status.planTier,
  )?.dailyCap

  const isCacStep = nextStepMode === 'server' && nextStep?.key === 'cac'
  const isSubmitting = createSession.isPending || verifyCac.isPending

  const handleStartWebCheck = () => {
    setError(null)
    createSession.mutate(undefined, {
      onSuccess: (res) => setSession(res),
      onError: (err: unknown) =>
        setError(apiErrorMessage(err, 'Could not start verification.')),
    })
  }

  const handleSubmitCac = () => {
    setError(null)
    if (!rcValue.trim()) {
      setError('Enter your RC number')
      return
    }
    verifyCac.mutate(
      { rcNumber: rcValue.trim() },
      {
        onSuccess: () => {
          showNotificationToast({
            message: 'Business verification submitted — checking…',
          })
          setRcValue('')
          refetch()
        },
        onError: (err: unknown) =>
          setError(apiErrorMessage(err, 'Could not verify CAC.')),
      },
    )
  }

  const handlePrimary = () => {
    if (isCacStep) return handleSubmitCac()
    handleStartWebCheck()
  }

  return (
    <div className="min-h-dvh bg-white font-satoshi">
      <div className="max-w-125 mx-auto min-h-dvh flex flex-col">
        <header className="flex items-center justify-between px-3 py-3.5">
          <button
            type="button"
            onClick={() => router.push('/profile')}
            aria-label="Back"
          >
            <ArrowLeft size={24} color="black" />
          </button>
          <Link
            href="/plans"
            className="text-xs font-medium text-black underline underline-offset-4"
          >
            Learn more
          </Link>
        </header>

        <h1 className="px-4 text-[20px] -tracking-[0.4px] font-bold text-black mt-2">
          Verify your identity
        </h1>
        <p className="px-4 text-sm font-medium text-[#00000080] mt-1.5">
          {dailyCap &&
            `Collect up to ${compactNaira(dailyCap)} daily when you provide more information that can be used to verify your identity and business.`}
        </p>

        {session ? (
          // The widget takes over the screen for the duration of the check.
          <div className="mt-6">
            <SmileIdEmbed
              session={session}
              onSuccess={() => {
                const submittedSession = session
                setLocallySubmittedCheck(submittedSession.check)
                setSession(null)
                markSessionSubmitted.mutate(
                  { jobId: submittedSession.jobId },
                  {
                    onSettled: () => {
                      refetch().finally(() => setLocallySubmittedCheck(null))
                    },
                  },
                )
              }}
              onClose={() => {
                setSession(null)
                refetch()
              }}
              onError={(message) => {
                setSession(null)
                setError(message)
              }}
            />
          </div>
        ) : (
          <>
            <div className="px-4">
              <VerificationStepList
                rows={rows}
                onRetry={isComplete ? undefined : handleStartWebCheck}
                className="mt-6"
              />

              {error && (
                <p className="text-sm text-[#FF002E] text-center mt-4">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-auto pt-6">
              {isComplete ? (
                <div className="border-t border-[#F1F1F1] rounded-t-[12px] p-4">
                  <div className="flex flex-col items-center text-center">
                    <p className="text-xl font-bold text-black">
                      You&apos;re verified
                    </p>
                    <p className="text-sm font-medium text-[#00000080] mt-1">
                      {status.verificationLevel
                        ? `Your ${status.verificationLevel === 'PROMAX' ? 'Verified Business' : 'Verified User'} badge is now active.`
                        : 'Your business account is fully set up.'}
                    </p>
                    <Button
                      onClick={() => router.push('/profile')}
                      className="w-full mt-4 font-bold"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-[#F1F1F1] rounded-t-[12px] px-4 pt-4 pb-2">
                  <p className="text-[11px] text-[#6B7280] font-medium text-center">
                    By continuing, I consent to identity checks via NIBSS iGree.
                  </p>

                  <Button
                    onClick={handlePrimary}
                    disabled={
                      isSubmitting || isVerificationConfirming || !nextStep
                    }
                    className="w-full mt-4 font-bold"
                  >
                    {isSubmitting ? (
                      <Spinner />
                    ) : isResuming ? (
                      'Continue verification'
                    ) : (
                      'Start verification'
                    )}
                  </Button>

                  <TagFooter className="py-4" />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <VerifyContent />
    </Suspense>
  )
}
