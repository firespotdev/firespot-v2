'use client'

import { Suspense, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Check, ChevronRight } from 'lucide-react'
import { Button, LoaderCircle, TabSwitch, showNotificationToast } from '@/components/ui'
import {
  usePlanCatalog,
  usePurchasePlan,
  type PlanDefinition,
  type PlanTier,
} from '@/services/merchant-plans'
import { formatCurrency } from '@/lib/utils'

const TIER_LABELS: Record<PlanTier, string> = {
  LITE: 'LITE',
  PRO: 'PRO',
  PROMAX: 'PRO MAX',
}

/** Per-tier accent for the feature check circles, mirroring the designs. */
const TIER_ACCENT: Record<PlanTier, string> = {
  LITE: 'bg-white text-black',
  PRO: 'bg-[#24C166] text-white',
  PROMAX: 'bg-[#F04438] text-white',
}

const TIER_BADGE: Record<PlanTier, string> = {
  LITE: 'bg-white text-black',
  PRO: 'bg-white text-black',
  PROMAX: 'bg-linear-to-r from-[#FB5012] to-[#D72483] text-white',
}

function priceLabel(plan: PlanDefinition): string {
  if (plan.billingType === 'one_time') {
    return `₦${formatCurrency(plan.price)} to upgrade, then `
  }
  if (plan.perStore) {
    return `₦${formatCurrency(plan.price)}/location/month`
  }
  return `₦${formatCurrency(plan.price)}/month`
}

function PlansContent() {
  const router = useRouter()
  const { data, isLoading } = usePlanCatalog()
  const purchase = usePurchasePlan()
  const [activeTier, setActiveTier] = useState<PlanTier>('LITE')

  const plans = data?.plans || []
  const current = data?.current
  const plan = useMemo(
    () => plans.find((p) => p.tier === activeTier),
    [plans, activeTier],
  )

  const isCurrentPlan = current?.planTier === activeTier

  const handleUpgrade = () => {
    if (!plan) return
    purchase.mutate(plan.tier, {
      onSuccess: (res) => {
        // Hand off to Paystack; we return via /plan-status?reference=
        window.location.href = res.authorizationUrl
      },
      onError: (err: any) => {
        showNotificationToast({
          message:
            err?.response?.data?.message || 'Could not start payment. Try again.',
        })
      },
    })
  }

  if (isLoading || !plan) {
    return (
      <div className="h-dvh bg-black flex items-center justify-center">
        <LoaderCircle innerBg="#000000" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-black font-satoshi text-white">
      <div className="max-w-125 mx-auto min-h-dvh flex flex-col">
        {/* Header: back + tier switcher */}
        <header className="flex items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="w-9 h-9 flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <TabSwitch<PlanTier>
            value={activeTier}
            onChange={setActiveTier}
            options={plans.map((p) => ({
              label: TIER_LABELS[p.tier],
              value: p.tier,
            }))}
            bgClassName="bg-[#FFFFFF1A]"
            maxW="max-w-none"
            className="mx-0 flex-1"
            activeClassName="bg-[#FFFFFF26] text-white font-bold"
            inactiveClassName="text-[#FFFFFF99] font-medium"
          />
        </header>

        <div className="flex-1 px-4 pb-40">
          {/* Tier icon */}
          <div className="flex justify-center mt-6">
            <div className="w-14 h-14 rounded-[16px] bg-white flex items-center justify-center">
              <Image
                src="/icons/firespot_logo.svg"
                alt="Firespot"
                width={28}
                height={28}
              />
            </div>
          </div>

          <h1 className="text-center text-[22px] font-bold mt-4 flex items-center justify-center gap-2 flex-wrap">
            Upgrade to Firespot Business
            <span
              className={`text-[10px] font-bold tracking-[1px] px-2 py-1 rounded-[6px] ${TIER_BADGE[plan.tier]}`}
            >
              {TIER_LABELS[plan.tier]}
            </span>
          </h1>

          <p className="text-center text-sm text-[#FFFFFF99] mt-2 px-2">
            {plan.tagline}
          </p>

          {/* Page dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {plans.map((p) => (
              <span
                key={p.tier}
                className={`w-1.5 h-1.5 rounded-full ${
                  p.tier === activeTier ? 'bg-white' : 'bg-[#FFFFFF4D]'
                }`}
              />
            ))}
          </div>

          {/* Feature list */}
          <div className="bg-[#FFFFFF0D] rounded-2xl mt-6 p-4 space-y-4">
            {plan.features.map((feature) => (
              <div key={feature.label} className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    feature.included
                      ? TIER_ACCENT[plan.tier]
                      : 'bg-[#FFFFFF26] text-[#FFFFFF66]'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3px]" />
                </span>
                <span
                  className={`flex-1 text-[15px] ${
                    feature.included ? 'text-white' : 'text-[#FFFFFF66]'
                  }`}
                >
                  {feature.label}
                </span>
                {feature.inheritsFrom && (
                  <ChevronRight className="w-4 h-4 text-[#FFFFFF66] shrink-0" />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => showNotificationToast({ message: 'Coming soon' })}
            className="mx-auto mt-6 flex items-center gap-1 text-sm text-white underline underline-offset-4"
          >
            Learn more
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Sticky price + CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-black">
          <div className="max-w-125 mx-auto px-4 pb-6">
            <div className="bg-[#FFFFFF0D] rounded-2xl p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-[10px] bg-[#24C166] flex items-center justify-center shrink-0 text-white font-bold">
                ₦
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#FFFFFF99]">Subscription</p>
                <p className="text-[15px] font-bold">
                  {priceLabel(plan)}
                  {plan.billingType === 'one_time' && (
                    <span className="text-[#F04438]">free forever</span>
                  )}
                </p>
              </div>
              {plan.billingType === 'monthly' && (
                <span className="shrink-0 text-[10px] font-bold tracking-[1px] text-white bg-[#FFFFFF1A] rounded-full px-3 py-2">
                  PER MONTH
                </span>
              )}
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={purchase.isPending || isCurrentPlan}
              className="w-full h-13 mt-3 rounded-full bg-white text-black text-base font-bold disabled:opacity-60"
            >
              {isCurrentPlan
                ? 'Your current plan'
                : purchase.isPending
                  ? 'Starting payment…'
                  : 'Upgrade now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlansPage() {
  return (
    <Suspense
      fallback={<div className="h-dvh bg-black" />}
    >
      <PlansContent />
    </Suspense>
  )
}
