'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { Button, LoaderCircle, TagFooter } from '@/components/ui'
import { useAuthStore, useAuthReady } from '@/services/auth'
import {
  usePlanCatalog,
  useVerifyPlanPayment,
  type PlanTier,
} from '@/services/merchant-plans'
import { TierIcon } from '@/components/merchant/tier-icon'

type Status = 'loading' | 'success' | 'failed' | 'pending'

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

const TIER_BADGE: Record<PlanTier, string> = {
  LITE: 'bg-transparent border border-white text-white',
  PRO: 'bg-white text-black',
  PROMAX: 'bg-linear-to-r from-[#FB5012] to-[#D72483] text-white',
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

  // The full definition of the tier just purchased — name, price, features,
  // billingType. Verification only hands back the tier key, so the rest comes
  // from the catalog.
  const { data: catalog } = usePlanCatalog()
  const plan = tier
    ? (catalog?.plans.find((p) => p.tier === tier) ?? null)
    : null

  useEffect(() => {
    if (!authReady) return
    if (!isAuthenticated) router.replace('/login')
  }, [authReady, isAuthenticated, router])

  const runVerify = useCallback(() => {
    setStatus('loading')
    verifyPlan.mutate(reference, {
      onSuccess: (res) => {
        if (res.success) {
          setTier(res.tier || null)
          setStatus('success')
        } else if (res.status === 'PENDING') {
          // Still settling (bank transfer / USSD). Nothing failed — the
          // charge.success webhook completes it, so invite a re-check rather
          // than telling the merchant their payment failed.
          setStatus('pending')
        } else {
          setStatus('failed')
          setError(
            res.reason === 'amount_mismatch'
              ? 'The amount paid did not match this plan. Please contact support.'
              : 'Your payment was not completed.',
          )
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
  }, [reference, verifyPlan])

  useEffect(() => {
    if (!reference || hasVerified.current || !authReady || !isAuthenticated) {
      return
    }
    hasVerified.current = true
    runVerify()
  }, [reference, authReady, isAuthenticated, runVerify])

  if (status === 'loading') {
    return (
      <div className="h-dvh bg-black flex items-center justify-center">
        <LoaderCircle innerBg="#000000" />
      </div>
    )
  }

  // Transaction is still settling. Deliberately not styled as an error — the
  // money is very likely on its way.
  if (status === 'pending') {
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
            <h1 className="text-2xl font-bold">Payment processing</h1>
            <p className="text-sm text-[#FFFFFF99] mt-2 max-w-[320px]">
              Your payment is still being confirmed. This usually takes a moment
              — your plan activates automatically once it clears.
            </p>
            <Button
              onClick={runVerify}
              disabled={verifyPlan.isPending}
              className="w-full max-w-xs h-13 mt-8 rounded-full bg-white text-black font-bold disabled:opacity-60"
            >
              {verifyPlan.isPending ? 'Checking…' : 'Check again'}
            </Button>
            <button
              type="button"
              onClick={() => router.replace('/profile')}
              className="mt-4 text-xs font-medium text-[#FFFFFF99] underline underline-offset-4"
            >
              Done for now
            </button>
          </div>
        </div>
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
          {/* TierIcon supplies its own container for LITE/PRO and none for
              PRO MAX, so it must not be wrapped in one here. */}
          {tier && <TierIcon tier={tier} size={40} />}

          <h1 className="text-[20px] text-center leading-[125%] font-bold mt-4 -tracking-[0.4px]">
            You are now using
            <br />
            Firespot Business{' '}
            {plan && (
              <span
                className={`text-[10px] w-fit font-bold px-1 rounded-[4px] h-4 inline-flex justify-center items-center ${TIER_BADGE[plan.tier]}`}
              >
                {TIER_LABELS[plan.tier]}
              </span>
            )}
          </h1>

          <p className="text-sm text-[#FFFFFFB2] mt-1 max-w-[320px]">
            Sell online and offline, all sales recorded automatically.
          </p>
        </div>

        <Button
          onClick={() => router.replace('/profile?verify=1')}
          className="w-full bg-white text-black text-base font-bold"
        >
          Set up Shop
        </Button>

        <TagFooter color="#FFFFFF66" icon="brand_offwhite" className="py-8" />
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
