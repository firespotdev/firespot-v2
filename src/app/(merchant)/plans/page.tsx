'use client'

import { Suspense, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Check, ChevronRight } from 'lucide-react'
import {
  Button,
  LoaderCircle,
  TabSwitch,
  showNotificationToast,
} from '@/components/ui'
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
  PROMAX: 'bg-linear-to-r from-[#FB5012] to-[#D72483]',
}

const TIER_BADGE: Record<PlanTier, string> = {
  LITE: 'bg-transparent border border-white text-white',
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
            err?.response?.data?.message ||
            'Could not start payment. Try again.',
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
        <header className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="w-6 h-6 flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={24} color="white" />
          </button>
          <TabSwitch<PlanTier>
            value={activeTier}
            onChange={setActiveTier}
            options={plans.map((p) => ({
              label: TIER_LABELS[p.tier],
              value: p.tier,
            }))}
            bgClassName="bg-[#222222]"
            maxW="max-w-none"
            className="mx-auto flex-1 max-w-[258px] h-9"
            activeClassName="bg-[#333333] text-white font-bold text-[10px] tracking-[1px] shadow-[0px_4px_8px_0px_#0000000A]"
            inactiveClassName="text-[#FFFFFF99] font-bold text-[10px] tracking-[1px]"
          />
          <div className="w-6 h-6"></div>
        </header>

        <div className="flex-1 px-4 pt-4 pb-40">
          {/* Tier icon */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 rounded-[12px] bg-white border-[1.11px] border-[#F1F1F1] shadow-[0px_4.44px_8.89px_0px_#0000000A] flex items-center justify-center">
              <Image
                src="/images/firespot_alt.png"
                alt="Firespot"
                width={22}
                height={22}
              />
            </div>
          </div>

          <h1 className="text-center text-[20px] -tracking-[0.4px] font-bold flex items-center justify-center gap-1.5 flex-wrap">
            Upgrade to Firespot Business
            <span
              className={`text-[10px] font-bold px-1 rounded-[4px] h-4 flex justify-center items-center ${TIER_BADGE[plan.tier]}`}
            >
              {TIER_LABELS[plan.tier]}
            </span>
          </h1>

          <p className="text-center text-sm font-medium text-[#FFFFFFB2] mt-1 px-2">
            {plan.tagline}
          </p>

          {/* Page dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {plans.map((p) => (
              <span
                key={p.tier}
                className={`w-1.5 h-1.5 rounded-full ${
                  p.tier === activeTier ? 'bg-white' : 'bg-[#FFFFFF66]'
                }`}
              />
            ))}
          </div>

          {/* Feature list */}
          <div className="bg-[#FFFFFF0D] rounded-[12px] mt-6 p-3 space-y-4 border border-[#F1F1F114] shadow-[0px_4px_8px_0px_#0000000A]">
            {plan.features.map((feature) => (
              <div key={feature.label} className="flex items-center gap-3">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    feature.included
                      ? TIER_ACCENT[plan.tier]
                      : 'bg-[#FFFFFF26] text-[#FFFFFF66]'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3px]" />
                </span>
                <span
                  className={`flex-1 font-medium text-[14px] text-[#FFFFFFB2]`}
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
            className="mx-auto mt-6 mb-10 flex items-center font-medium gap-1 text-xs text-white underline underline-offset-4"
          >
            Learn more
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Sticky price + CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-black border border-[#CBD5E133] shadow-[0px_-1px_1px_0px_#FFFFFF14] rounded-t-[12px]">
          <div className="max-w-125 mx-auto p-4 pb-6">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-[6px] bg-[#33A061] flex items-center justify-center shrink-0 text-white font-medium">
                ₦
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#9CA3AF]">
                  Subscription
                </p>
                <p className="text-[14px] font-bold">
                  {priceLabel(plan)}
                  {plan.billingType === 'one_time' && (
                    <span className="text-[#F04438]">free forever</span>
                  )}
                </p>
              </div>
              {plan.billingType === 'monthly' && (
                <span className="shrink-0 text-[10px] font-bold tracking-[1px] text-white bg-[#FFFFFF33] rounded-full px-3 h-9">
                  PER MONTH
                </span>
              )}
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={purchase.isPending || isCurrentPlan}
              className="w-full mt-4 bg-white text-black disabled:opacity-60"
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
    <Suspense fallback={<div className="h-dvh bg-black" />}>
      <PlansContent />
    </Suspense>
  )
}
