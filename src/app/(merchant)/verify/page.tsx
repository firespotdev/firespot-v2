'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  LoaderCircle,
  Spinner,
  showNotificationToast,
} from '@/components/ui'
import {
  useKycStatus,
  useCreateKycSession,
  useVerifyNin,
  useVerifyCac,
  type KycSessionResponse,
} from '@/services/kyc'
import type { KycCheck } from '@/services/merchant-plans'
import { SmileIdEmbed } from '@/components/kyc/smileid-embed'

const CHECK_LABELS: Record<KycCheck, string> = {
  bvn: 'Bank Verification Number',
  nin: 'National Identity Number',
  liveness: 'Liveness check (Selfie)',
  cac: 'CAC business registration',
}

function VerifyContent() {
  const router = useRouter()
  // Poll while incomplete so async SmileID callbacks land without a refresh.
  const { data: status, isLoading, refetch } = useKycStatus(true)
  const createSession = useCreateKycSession()
  const verifyNin = useVerifyNin()
  const verifyCac = useVerifyCac()

  const [session, setSession] = useState<KycSessionResponse | null>(null)
  const [ninValue, setNinValue] = useState('')
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

  const { requiredChecks, checks, nextCheck, nextCheckMode, isComplete } = status
  const passedCount = requiredChecks.filter(
    (c) => checks?.[c]?.status === 'passed',
  ).length

  const handleStartWebCheck = () => {
    setError(null)
    createSession.mutate(undefined, {
      onSuccess: (res) => setSession(res),
      onError: (err: any) =>
        setError(
          err?.response?.data?.message || 'Could not start verification.',
        ),
    })
  }

  const handleSubmitNin = () => {
    setError(null)
    if (ninValue.trim().length < 10) {
      setError('Enter a valid NIN')
      return
    }
    verifyNin.mutate(
      { idNumber: ninValue.trim() },
      {
        onSuccess: (res: any) => {
          if (res?.passed) {
            showNotificationToast({ message: 'NIN verified' })
            setNinValue('')
          } else {
            setError('We could not verify that NIN. Check it and try again.')
          }
          refetch()
        },
        onError: (err: any) =>
          setError(err?.response?.data?.message || 'Could not verify NIN.'),
      },
    )
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
        onError: (err: any) =>
          setError(err?.response?.data?.message || 'Could not verify CAC.'),
      },
    )
  }

  return (
    <div className="min-h-dvh bg-white font-satoshi">
      <div className="max-w-125 mx-auto min-h-dvh flex flex-col">
        <header className="flex items-center px-4 py-3">
          <button
            type="button"
            onClick={() => router.push('/profile')}
            aria-label="Back"
            className="w-9 h-9 flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6 text-black" />
          </button>
          <h1 className="flex-1 text-center text-base font-bold text-black">
            Verify your identity
          </h1>
          <div className="w-9" />
        </header>

        <div className="flex-1 px-4 pb-8">
          {/* Progress — makes resumption legible */}
          <p className="text-sm text-[#00000080] mb-4">
            {passedCount} of {requiredChecks.length} checks complete
          </p>

          <div className="border border-[#F1F1F1] rounded-2xl overflow-hidden mb-6">
            {requiredChecks.map((check) => {
              const state = checks?.[check]?.status || 'pending'
              const isNext = check === nextCheck
              return (
                <div
                  key={check}
                  className="flex items-center gap-3 p-4 border-b border-[#F1F1F1] last:border-b-0"
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      state === 'passed'
                        ? 'bg-[#24C166] text-white'
                        : state === 'failed'
                          ? 'bg-[#F04438] text-white'
                          : 'bg-[#F1F1F1] text-[#9CA3AF]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-black">
                      {CHECK_LABELS[check]}
                    </p>
                    <p className="text-xs text-[#00000066] mt-0.5 capitalize">
                      {state === 'passed'
                        ? 'Verified'
                        : state === 'failed'
                          ? 'Failed — retry'
                          : isNext
                            ? 'Next step'
                            : 'Pending'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {isComplete ? (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#E9F9F0] flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-[#24C166]" />
              </div>
              <p className="text-lg font-bold text-black mt-4">
                You&apos;re verified
              </p>
              <p className="text-sm text-[#00000080] mt-1">
                {status.verificationLevel
                  ? `Your ${status.verificationLevel === 'PROMAX' ? 'Verified Business' : 'Verified User'} badge is now active.`
                  : 'Your business account is fully set up.'}
              </p>
              <Button
                onClick={() => router.push('/profile')}
                className="w-full h-13 mt-6 rounded-full bg-black text-white font-bold"
              >
                Done
              </Button>
            </div>
          ) : session ? (
            <SmileIdEmbed
              session={session}
              onSuccess={() => {
                setSession(null)
                showNotificationToast({ message: 'Submitted — checking…' })
                refetch()
              }}
              onClose={() => {
                // Dropping off is fine: state is server-side, so returning
                // here resumes at the same step.
                setSession(null)
                refetch()
              }}
              onError={(message) => {
                setSession(null)
                setError(message)
              }}
            />
          ) : nextCheck === 'nin' ? (
            <div className="space-y-4">
              <div>
                <Label>National Identity Number (NIN)</Label>
                <Input
                  value={ninValue}
                  onChange={(e) =>
                    setNinValue(e.target.value.replace(/\D/g, '').slice(0, 11))
                  }
                  inputMode="numeric"
                  placeholder="Enter your 11-digit NIN"
                  className="w-full font-medium"
                />
              </div>
              <Button
                onClick={handleSubmitNin}
                disabled={verifyNin.isPending}
                className="w-full h-13 rounded-full bg-black text-white font-bold"
              >
                {verifyNin.isPending ? <Spinner /> : 'Verify NIN'}
              </Button>
            </div>
          ) : nextCheck === 'cac' ? (
            <div className="space-y-4">
              <div>
                <Label>CAC registration (RC) number</Label>
                <Input
                  value={rcValue}
                  onChange={(e) => setRcValue(e.target.value)}
                  placeholder="e.g. RC1234567"
                  className="w-full font-medium"
                />
              </div>
              <Button
                onClick={handleSubmitCac}
                disabled={verifyCac.isPending}
                className="w-full h-13 rounded-full bg-black text-white font-bold"
              >
                {verifyCac.isPending ? <Spinner /> : 'Verify business'}
              </Button>
            </div>
          ) : nextCheckMode === 'web_sdk' && nextCheck ? (
            <div className="space-y-4">
              <p className="text-sm text-[#00000080]">
                {nextCheck === 'bvn'
                  ? 'You’ll be asked to consent and enter your BVN securely.'
                  : 'You’ll be asked to take a quick selfie to confirm it’s you.'}
              </p>
              <Button
                onClick={handleStartWebCheck}
                disabled={createSession.isPending}
                className="w-full h-13 rounded-full bg-black text-white font-bold"
              >
                {createSession.isPending ? (
                  <Spinner />
                ) : (
                  `Start ${CHECK_LABELS[nextCheck]}`
                )}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-[#00000080] text-center py-6">
              Checking your verification status…
            </p>
          )}

          {error && (
            <p className="text-sm text-[#F04438] text-center mt-4">{error}</p>
          )}
        </div>
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
