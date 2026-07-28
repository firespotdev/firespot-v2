'use client'

import { ChevronDown, Minus, Plus, Trash2, ScrollText } from 'lucide-react'
// bprogress's router so the top progress bar shows on the push to /verify.
import { useRouter } from '@bprogress/next/app'
import { useDrawerStore } from '@/services/drawer'
import { Button, showNotificationToast } from '@/components/ui'
import { TierIcon } from '@/components/merchant/tier-icon'
import {
  usePlanCatalog,
  usePurchasePlan,
  usePlanPreview,
  usePlanPaymentMethods,
  planTotal,
  planUnitPrice,
  frequencyLabel,
  type PlanTier,
  type BillingInterval,
  type PlanPaymentMethod,
} from '@/services/merchant-plans'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'

interface PlanCheckoutDrawerProps {
  tier: PlanTier
  interval: BillingInterval
  closeDrawer: () => void
}

export function PlanCheckoutDrawer({
  tier,
  interval,
}: PlanCheckoutDrawerProps) {
  const router = useRouter()
  const { closeDrawer } = useDrawerStore()
  const { data } = usePlanCatalog()
  const { data: paymentMethodsData } = usePlanPaymentMethods()
  const purchase = usePurchasePlan()
  // Quoted by the same code that charges, so the figure shown is the figure
  // taken — a mid-cycle change is credited and differs from list price.
  const { data: preview } = usePlanPreview({ tier, interval })

  const plan = data?.plans.find((p) => p.tier === tier)
  const storeCount = data?.current.activeStoreCount ?? 1

  if (!plan) return null

  const isOneTime = plan.billingType === 'one_time'
  const unitPrice = planUnitPrice(plan, interval)
  const listTotal = planTotal(plan, interval, storeCount)
  // Fall back to list price only until the quote arrives.
  const total = preview ? preview.amountDue : listTotal
  const credit = preview?.credit ?? 0
  // Use the quoted subtotal so `subtotal − credit === total` on screen; a
  // mid-cycle upgrade prorates the new cost too, not just the credit.
  const subtotal = preview?.subtotal ?? listTotal
  const frequency = frequencyLabel(plan, interval)

  const isBlocked = preview?.blocked === true
  const isDeferred = preview?.deferred === true
  const resetsPeriod = preview?.resetsPeriod === true
  const paymentMethod =
    paymentMethodsData?.defaultMethod || ('PAYSTACK_CHECKOUT' as const)
  const paymentMethodLabel =
    paymentMethodsData?.methods.find((method) => method.id === paymentMethod)
      ?.label || 'Paystack checkout'

  const close = () => closeDrawer('plan-checkout')

  const startPayment = (
    method: PlanPaymentMethod,
    fallBackToPaystack = true,
  ) => {
    purchase.mutate(
      {
        tier,
        interval: isOneTime ? undefined : interval,
        paymentMethod: method,
      },
      {
        onSuccess: (res) => {
          if (res.authorizationUrl) {
            // Hand off to Paystack; we return via /plan-status?reference=
            window.location.href = res.authorizationUrl
            return
          }
          // Charged the saved card (or nothing to pay) — no redirect needed.
          showNotificationToast({
            message:
              res.type === 'upgraded' || res.type === 'purchased'
                ? res.amountCharged
                  ? res.type === 'purchased'
                    ? `Plan activated. You were charged NGN ${formatCurrency(res.amountCharged)}.`
                    : `Upgraded. You were charged NGN ${formatCurrency(res.amountCharged)} for the rest of this period.`
                  : 'Upgraded — no extra charge for the rest of this period.'
                : 'Your plan change is scheduled.',
            mode:
              res.type === 'upgraded' || res.type === 'purchased'
                ? 'success'
                : 'info',
          })
          close()

          // The new tier needs checks the merchant hasn't done (PRO → PRO MAX
          // adds CAC). This path never visits Paystack, so without an explicit
          // push they'd be left on the plans page never knowing.
          if (
            (res.type === 'upgraded' || res.type === 'purchased') &&
            res.nextStep
          ) {
            router.push('/verify')
          }
        },
        onError: (err: unknown) => {
          const response = (
            err as {
              response?: {
                data?: { code?: string; message?: string }
              }
            }
          ).response?.data
          const code = response?.code
          const message =
            response?.message || 'Could not start payment. Try again.'
          if (
            code === 'SAVED_PAYMENT_METHOD_FAILED' ||
            code === 'SAVED_PAYMENT_METHOD_UNAVAILABLE'
          ) {
            if (fallBackToPaystack) {
              startPayment('PAYSTACK_CHECKOUT', false)
              return
            }
            showNotificationToast({
              message: `${message} Try Paystack Checkout again.`,
              mode: 'error',
            })
            return
          }
          showNotificationToast({
            message,
            mode: 'error',
          })
        },
      },
    )
  }

  return (
    <div className="w-full flex flex-col font-satoshi bg-white max-w-125 mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between py-2.5 px-4">
        <button
          onClick={close}
          aria-label="Close"
          className="w-8 h-8 flex items-center justify-center text-black"
        >
          <ChevronDown className="w-8 h-8 stroke-[2px]" />
        </button>
        <div className="text-center">
          <h2 className="text-[16px] font-bold text-black leading-none">
            Checkout
          </h2>
          <div className="mt-1 flex items-center justify-center gap-1">
            <p className="text-sm text-[#00000080] font-medium">
              Complete order @firespot
            </p>
            <Image
              src="/icons/verified.svg"
              width={14}
              height={14}
              alt="badge"
            />
          </div>
        </div>
        <button
          onClick={close}
          className="text-xs font-medium text-black underline underline-offset-4"
        >
          Clear
        </button>
      </header>

      {/* Line item */}
      <div className="border-t border-[#F1F1F1] pt-4 px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-black">{plan.name}</p>
            <p className="text-[14px] text-[#9CA3AF] font-medium mt-1">
              {isOneTime ? 'One time upgrade fee' : 'Subscription'}
            </p>
          </div>
          <TierIcon tier={tier} size={40} />
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <button
              onClick={close}
              aria-label="Remove"
              className="w-9 h-9 rounded-[10px] bg-[#F1F1F1] flex items-center justify-center text-black"
            >
              <Trash2 size={16} color="black" />
            </button>
            {/* Quantity is fixed at 1 (per-store totals are computed for you). */}
            <div className="flex items-center rounded-[10px] bg-[#F1F1F1] h-9">
              <span className="w-9 h-9 flex items-center justify-center text-[#C7C7CC]">
                <Minus className="w-4 h-4" />
              </span>
              <span className="w-8 text-center text-[15px] font-bold text-black">
                1
              </span>
              <span className="w-9 h-9 flex items-center justify-center text-[#C7C7CC]">
                <Plus className="w-4 h-4" />
              </span>
            </div>
          </div>
          <span className="text-[14px] font-bold text-black">
            NGN {formatCurrency(unitPrice)}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="border-t border-[#F1F1F1] mt-4 pt-4 px-4">
        <div className="flex justify-between text-[14px] mb-3">
          <span className="text-[#6B7280] font-medium">Subtotal</span>
          <span className="font-medium text-black">
            NGN {formatCurrency(subtotal)}
          </span>
        </div>
        {credit > 0 && (
          <div className="flex justify-between text-[14px] mb-3">
            <span className="text-[#6B7280] font-medium">
              Credit for unused days
            </span>
            <span className="font-medium text-[#33A061]">
              − NGN {formatCurrency(credit)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-[14px] mb-4">
          <span className="text-[#6B7280] font-medium">Frequency</span>
          <span className="font-medium text-black">{frequency}</span>
        </div>
        {/* {plan.perStore && storeCount > 1 && (
          <div className="flex justify-between text-xs">
            <span className="text-[#9CA3AF] font-medium">Stores billed</span>
            <span className="text-[#9CA3AF] font-medium">
              {storeCount} × NGN {formatCurrency(unitPrice)}
            </span>
          </div>
        )} */}
        <div className="flex justify-between text-[14px] border-t pb-4 border-[#F1F1F1] pt-4">
          <span className="font-bold text-black">Total</span>
          <span className="font-bold text-black">
            NGN {formatCurrency(total)}
          </span>
        </div>
      </div>

      <div className="px-4 w-full border-t border-[#F1F1F1] rounded-t-[12px]">
        {!isDeferred && (
          <div className="mt-4 flex items-center gap-3">
            <span className="w-6 h-6 rounded-[6px] bg-[#0B1220] flex items-center justify-center shrink-0">
              <ScrollText className="w-5 h-5 text-[#3B82F6]" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#64748B] font-medium">
                Payment method
              </p>
              <p className="truncate text-[14px] font-bold text-black">
                {paymentMethodLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => startPayment('PAYSTACK_CHECKOUT', false)}
              disabled={purchase.isPending || isBlocked}
              className="shrink-0 text-[10px] font-bold tracking-[1px] text-black bg-[#F1F1F1] rounded-full px-4 h-9 disabled:opacity-50"
            >
              CHANGE
            </button>
          </div>
        )}

        {/* Pay */}
        <Button
          onClick={() => startPayment(paymentMethod)}
          disabled={purchase.isPending || isBlocked}
          className="w-full h-12 mt-4 rounded-full bg-[#24C166] hover:bg-[#24C166]/90 text-white text-[16px] font-bold disabled:opacity-60"
        >
          {isBlocked
            ? 'Not available'
            : purchase.isPending
              ? 'Starting payment…'
              : isDeferred
                ? 'Confirm change'
                : `Pay NGN ${formatCurrency(total)}`}
        </Button>

        {isBlocked && preview?.reason && (
          <p className="text-xs text-[#F04438] text-center mt-3 leading-[132%]">
            {preview.reason}
          </p>
        )}

        {!isBlocked && credit > 0 && (
          <p className="text-xs text-[#33A061] text-center mt-3 font-medium leading-[132%]">
            {resetsPeriod
              ? `Includes NGN ${formatCurrency(credit)} credit for the days left on your current plan. Your renewal moves to a year from today.`
              : `You're only charged the difference for the days left in your current period, and your renewal date stays the same.`}
          </p>
        )}

        {isDeferred && (
          <p className="text-xs text-[#6B7280] text-center mt-3">
            Nothing to pay now — this takes effect when your current plan ends.
          </p>
        )}

        {/* {supersedesExisting && (
          <p className="text-xs text-[#6B7280] text-center mt-3 px-2">
            Your current{' '}
            {current?.currentInterval === 'annually' ? 'yearly' : 'monthly'}{' '}
            subscription will be cancelled automatically.
          </p>
        )} */}

        <p className="text-xs text-[#6B7280] text-center my-4 leading-[132%]">
          <span className="mr-1">⚠️</span>
          Important: No one should collect activation fees on behalf of
          Firespot. Payment happens only inside the app.
        </p>
      </div>
    </div>
  )
}
