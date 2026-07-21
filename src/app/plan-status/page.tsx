'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { Button, LoaderCircle } from '@/components/ui'
import { useAuthStore, useAuthReady } from '@/services/auth'
import { useVerifyPlanPayment, type PlanTier } from '@/services/merchant-plans'

type Status = 'loading' | 'success' | 'failed'

const TIER_LABELS: Record<PlanTier, string> = {
  LITE: 'LITE',
  PRO: 'PRO',
  PROMAX: 'PRO MAX',
}

const TIER_TAGLINE: Record<PlanTier, string> = {
  LITE: 'Start collecting payments with your verified Firespot business account.',
  PRO: 'Sell online and offline, all sales recorded automatically.',
  PROMAX: 'Run your business fully on Firespot Business Platform.',
}

function PlanStatusContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reference = searchParams.get('reference') || ''

  const authReady = useAuthReady()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [status, setStatus] = useState<Status>('loading')
  const [tier, setTier] = useState<PlanTier | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasVerified = useRef(false)

  const verifyPlan = useVerifyPlanPayment()

  useEffect(() => {
    if (!authReady) return
    if (!isAuthenticated) router.replace('/login')
  }, [authReady, isAuthenticated, router])

  useEffect(() => {
    if (!reference || hasVerified.current || !authReady || !isAuthenticated) {
      return
    }
    hasVerified.current = true

    verifyPlan.mutate(reference, {
      onSuccess: (res) => {
        if (res.success) {
          setTier(res.tier || null)
          setStatus('success')
        } else {
          setStatus('failed')
          setError('Your payment was not completed.')
        }
      },
      onError: (err: any) => {
        setStatus('failed')
        setError(
          err?.response?.data?.message ||
            'We could not verify your payment. Please contact support.',
        )
      },
    })
  }, [reference, authReady, isAuthenticated, verifyPlan])

  if (status === 'loading') {
    return (
      <div className="h-dvh bg-black flex items-center justify-center">
        <LoaderCircle innerBg="#000000" />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="h-dvh bg-black font-satoshi text-white flex flex-col">
        <div className="max-w-125 mx-auto w-full flex-1 flex flex-col px-6">
          <header className="flex justify-end py-4">
            <button
              type="button"
              onClick={() => router.replace('/profile')}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h1 className="text-2xl font-bold">Payment not completed</h1>
            <p className="text-sm text-[#FFFFFF99] mt-2">{error}</p>
            <Button
              onClick={() => router.replace('/plans')}
              className="w-full max-w-xs h-13 mt-8 rounded-full bg-white text-black font-bold"
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh bg-black font-satoshi text-white flex flex-col">
      <div className="max-w-125 mx-auto w-full flex-1 flex flex-col px-6">
        <header className="flex justify-end py-4">
          <button
            type="button"
            onClick={() => router.replace('/profile')}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-[18px] bg-white flex items-center justify-center">
            <Image
              src="/icons/firespot_logo.svg"
              alt="Firespot"
              width={32}
              height={32}
            />
          </div>

          <h1 className="text-[28px] leading-tight font-bold mt-6">
            You are now using
            <br />
            Firespot Business{' '}
            {tier && (
              <span className="align-middle text-[12px] font-bold tracking-[1px] px-2 py-1 rounded-[6px] bg-white text-black">
                {TIER_LABELS[tier]}
              </span>
            )}
          </h1>

          <p className="text-base text-[#FFFFFF99] mt-4 max-w-[320px]">
            {tier ? TIER_TAGLINE[tier] : ''}
          </p>
        </div>

        <div className="pb-8">
          {/* Payment unlocks KYC — send them to the profile where the
              "Verify your identity" drawer opens automatically. */}
          <Button
            onClick={() => router.replace('/profile?verify=1')}
            className="w-full h-14 rounded-full bg-white text-black text-base font-bold"
          >
            Set up Shop
          </Button>

          <div className="flex items-center justify-center gap-2 mt-6">
            <span className="text-sm text-[#FFFFFF66]">Powered by</span>
            <Image
              src="/icons/firespot_logo.svg"
              alt="Firespot"
              width={18}
              height={18}
            />
            <span className="text-sm font-bold text-[#FFFFFF99]">firespot</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlanStatusPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-black" />}>
      <PlanStatusContent />
    </Suspense>
  )
}
