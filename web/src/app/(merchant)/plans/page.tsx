'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { format } from 'date-fns'
import { Button, LoaderCircle, TabSwitch } from '@/components/ui'
import { TierIcon } from '@/components/merchant/tier-icon'
import { useDrawerStore } from '@/services/drawer'
import {
  usePlanCatalog,
  planTotal,
  isDowngrade,
  type PlanDefinition,
  type PlanTier,
  type BillingInterval,
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

/** Subtitle for a subscription tier's bottom bar, reflecting the interval. */
function priceSubtitle(
  plan: PlanDefinition,
  interval: BillingInterval,
  storeCount: number,
): string {
  const total = planTotal(plan, interval, storeCount)
  const cadence = interval === 'annually' ? 'year' : 'month'
  if (plan.perStore) {
    return `₦${formatCurrency(total)}/location/${cadence}`
  }
  return `₦${formatCurrency(total)}/${cadence}`
}

function PlansContent() {
  const router = useRouter()
  const { data, isLoading } = usePlanCatalog()
  const openDrawer = useDrawerStore((s) => s.openDrawer)
  const [activeTier, setActiveTier] = useState<PlanTier>('LITE')
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [freqOpen, setFreqOpen] = useState(false)

  const plans = data?.plans || []
  const current = data?.current
  const plan = useMemo(
    () => plans.find((p) => p.tier === activeTier),
    [plans, activeTier],
  )

  const storeCount = current?.activeStoreCount ?? 1
  // A lapsed merchant still "holds" their tier but has been demoted to the
  // LITE floor, so re-buying it must be allowed — that is a reactivation.
  const isLapsed = Boolean(current?.isLapsed)
  // Yearly merchants change plan on the yearly cadence only.
  const isOnYearly = current?.currentInterval === 'annually'

  // Default the selector to the merchant's actual cadence, so a yearly
  // merchant doesn't open on a combination the server would reject.
  useEffect(() => {
    if (isOnYearly) setInterval('annually')
  }, [isOnYearly])
  const holdsThisTier = current?.planTier === activeTier
  // Switching billing cycle on the tier you already hold is a plan change,
  // not a repurchase — the old subscription is superseded server-side.
  const isIntervalSwitch =
    holdsThisTier &&
    !isLapsed &&
    plan?.billingType === 'monthly' &&
    Boolean(current?.currentInterval) &&
    interval !== current?.currentInterval
  const isCurrentPlan = holdsThisTier && !isLapsed && !isIntervalSwitch
  // Merchants can only move up — a lower tier than the one they hold is
  // blocked here and again server-side.
  const isLowerTier = isDowngrade(current?.planTier ?? null, activeTier)
  const isReactivate = holdsThisTier && isLapsed
  // A change already scheduled blocks further changes until it lands.
  const pending = current?.pendingPlanChange ?? null
  const hasPending = Boolean(pending)
  const canPurchase =
    !hasPending && (isReactivate || isIntervalSwitch || !isCurrentPlan)
  // "Manage subscription" only applies to a live recurring plan.
  const showManage =
    holdsThisTier && !isLapsed && !hasPending && plan?.billingType === 'monthly'

  const pendingDate = pending
    ? (() => {
        try {
          return format(new Date(pending.effectiveAt), 'd MMM')
        } catch {
          return ''
        }
      })()
    : ''

  const handleUpgrade = () => {
    if (!plan || !canPurchase) return
    // Downgrading to LITE is a cancellation — LITE returns free when the
    // subscription ends, so it goes through the cancel flow, not checkout.
    if (isLowerTier && plan.tier === 'LITE') {
      openDrawer({ type: 'cancel-plan' })
      return
    }
    openDrawer({
      type: 'plan-checkout',
      props: { tier: plan.tier, interval },
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
        {/* Header: back + tier switcher (sticky) */}
        <header className="sticky top-0 z-20 bg-black flex items-center gap-2 px-3 py-2">
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

        <div className="flex-1 px-4 pt-4 pb-38">
          {/* Tier icon (dynamic per tier) */}
          <div className="flex justify-center mb-4">
            <TierIcon tier={plan.tier} size={40} />
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
                {feature.icon ? (
                  <Image
                    src={`/icons/${feature.icon}.svg`}
                    alt=""
                    width={20}
                    height={20}
                    className="w-5 h-5 shrink-0"
                  />
                ) : (
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      feature.included
                        ? TIER_ACCENT[plan.tier]
                        : 'bg-[#FFFFFF26] text-[#FFFFFF66]'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3px]" />
                  </span>
                )}
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
            className="mx-auto my-6 flex items-center font-medium gap-1 text-xs text-white underline underline-offset-4"
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
                  {plan.billingType === 'one_time'
                    ? 'One time upgrade fee'
                    : 'Subscription'}
                </p>
                <p className="text-[14px] font-bold">
                  {plan.billingType === 'one_time' ? (
                    <>
                      {`₦${formatCurrency(plan.price)} to upgrade, then `}
                      <span className="bg-linear-to-r from-[#FB5012] to-[#D72483] bg-clip-text text-transparent">
                        free forever
                      </span>
                    </>
                  ) : (
                    priceSubtitle(plan, interval, storeCount)
                  )}
                </p>
              </div>

              {plan.billingType === 'monthly' && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setFreqOpen((o) => !o)}
                    className="flex items-center gap-1 text-[10px] font-bold tracking-[1px] text-white bg-[#FFFFFF33] rounded-full px-3 h-9"
                  >
                    {interval === 'annually' ? 'PER YEAR' : 'PER MONTH'}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {freqOpen && (
                    <div className="absolute right-0 bottom-11 w-36 bg-[#1A1A1A] border border-[#FFFFFF1A] rounded-[12px] overflow-hidden z-10">
                      {(['monthly', 'annually'] as BillingInterval[]).map(
                        (opt) => {
                          // A yearly merchant can only change plan on the
                          // yearly cadence; monthly is unavailable until the
                          // year ends (server rejects it too).
                          const locked = isOnYearly && opt === 'monthly'
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={locked}
                              onClick={() => {
                                if (locked) return
                                setInterval(opt)
                                setFreqOpen(false)
                              }}
                              className={`w-full text-left px-4 py-3 text-[10px] font-bold tracking-[1px] ${
                                locked
                                  ? 'text-[#FFFFFF4D] cursor-not-allowed'
                                  : interval === opt
                                    ? 'text-white bg-[#FFFFFF14]'
                                    : 'text-[#FFFFFF99]'
                              }`}
                            >
                              {opt === 'annually' ? 'PER YEAR' : 'PER MONTH'}
                              {locked && (
                                <span className="block text-[9px] font-medium tracking-normal text-[#FFFFFF4D] mt-0.5">
                                  Available after your year ends
                                </span>
                              )}
                            </button>
                          )
                        },
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={!canPurchase}
              className="w-full mt-4 bg-white text-black disabled:opacity-60"
            >
              {hasPending
                ? `${TIER_LABELS[pending!.tier]} starts ${pendingDate}`
                : isReactivate
                  ? `Reactivate ${TIER_LABELS[activeTier]}`
                  : isIntervalSwitch
                    ? `Switch to ${interval === 'annually' ? 'yearly' : 'monthly'}`
                    : isCurrentPlan
                      ? 'Your current plan'
                      : isLowerTier
                        ? `Downgrade to ${TIER_LABELS[activeTier]}`
                        : 'Upgrade now'}
            </Button>

            {/* Cancellation lives here, under the CTA, for live plans only. */}
            {showManage && (
              <button
                type="button"
                onClick={() => openDrawer({ type: 'cancel-plan' })}
                className="w-full mt-3 text-xs font-medium text-[#FFFFFF99] underline underline-offset-4"
              >
                {current?.cancelAtPeriodEnd
                  ? 'Subscription ending — view details'
                  : 'Manage subscription'}
              </button>
            )}
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
