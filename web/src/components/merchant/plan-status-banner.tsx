'use client'

import Link from 'next/link'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { usePlanCatalog } from '@/services/merchant-plans'

const TIER_LABELS: Record<string, string> = {
  LITE: 'LITE',
  PRO: 'PRO',
  PROMAX: 'PRO MAX',
}

/**
 * Subscription trouble banner. Renders in the same slot as the "Recent sales"
 * banner inside the merchant card, and matches its shape (bordered card, icon,
 * title + subtitle, chevron) in alert colours.
 *
 * Two states:
 *  - grace  : charge failed, full access continues until planGraceUntil
 *  - lapsed : grace elapsed, merchant is on the LITE floor
 */
export function PlanStatusBanner() {
  const { data } = usePlanCatalog()
  const current = data?.current

  if (!current?.planTier) return null
  if (!current.isLapsed && !current.isInGracePeriod) return null

  const tier = TIER_LABELS[current.planTier] || current.planTier
  const lapsed = current.isLapsed

  let deadline = ''
  if (current.planGraceUntil) {
    try {
      deadline = format(new Date(current.planGraceUntil), 'd MMM')
    } catch {
      deadline = ''
    }
  }

  return (
    <Link
      href="/plans"
      className={`w-full flex items-center gap-3 py-3 px-4 bg-white rounded-[12px] shadow-[0px_2px_8px_0px_#0000000A] border-[3px] mb-2 ${
        lapsed ? 'border-[#F044384D]' : 'border-[#BB81234D]'
      }`}
    >
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
          lapsed ? 'bg-[#F04438]' : 'bg-[#BB8123]'
        }`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-white" />
      </span>

      <div className="flex-1 min-w-0">
        <p
          className={`leading-none text-left text-base font-medium ${
            lapsed ? 'text-[#8A1C13]' : 'text-[#6B4200]'
          }`}
        >
          {lapsed ? `${tier} plan ended` : 'Payment failed'}
        </p>
        <span
          className={`text-[13px] font-medium ${
            lapsed ? 'text-[#F04438]' : 'text-[#BB8123]'
          }`}
        >
          {lapsed
            ? "You're on LITE limits — reactivate to restore"
            : deadline
              ? `Update payment by ${deadline} to keep ${tier}`
              : `Update payment to keep ${tier}`}
        </span>
      </div>

      <ChevronRight className="w-4 h-4 text-[#BDBDBD] shrink-0" />
    </Link>
  )
}
