'use client'

import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { useDrawerStore } from '@/services/drawer'
import { Button, CircularIconButton, showNotificationToast } from '../ui'
import {
  usePlanCatalog,
  useCancelPlan,
  type PlanTier,
} from '@/services/merchant-plans'

const TIER_LABELS: Record<PlanTier, string> = {
  LITE: 'LITE',
  PRO: 'PRO',
  PROMAX: 'PRO MAX',
}

interface CancelPlanDrawerProps {
  closeDrawer: () => void
}

/**
 * Cancels a recurring plan. Access is not revoked immediately — the current
 * period is already paid, so the merchant keeps the tier until it ends and
 * then falls back to the LITE floor.
 */
export function CancelPlanDrawer({}: CancelPlanDrawerProps) {
  const { closeDrawer } = useDrawerStore()
  const { data } = usePlanCatalog()
  const cancelPlan = useCancelPlan()

  const current = data?.current
  const tier = current?.planTier ? TIER_LABELS[current.planTier] : 'your plan'

  let activeUntil = ''
  if (current?.planCurrentPeriodEnd) {
    try {
      activeUntil = format(new Date(current.planCurrentPeriodEnd), 'd MMM yyyy')
    } catch {
      activeUntil = ''
    }
  }

  const close = () => closeDrawer('cancel-plan')

  const handleCancel = () => {
    cancelPlan.mutate(undefined, {
      onSuccess: (res) => {
        showNotificationToast({
          message: res.activeUntil
            ? `Cancelled. You keep ${tier} until ${format(new Date(res.activeUntil), 'd MMM')}.`
            : 'Subscription cancelled.',
        })
        close()
      },
      onError: (err: any) => {
        showNotificationToast({
          message:
            err?.response?.data?.message ||
            'Could not cancel. Please try again.',
        })
      },
    })
  }

  return (
    <div className="flex flex-col font-satoshi px-4 pb-4">
      <header className="flex justify-end items-center py-2">
        <CircularIconButton icon="x" onClick={close} />
      </header>

      <div className="flex flex-col items-center text-center px-2">
        <span className="w-14 h-14 rounded-full bg-[#FEF3F2] flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-[#F04438]" />
        </span>

        <h2 className="text-xl font-bold text-black mt-4">
          Cancel Firespot Business {tier}?
        </h2>
        <p className="text-sm text-[#00000080] mt-2">
          {activeUntil
            ? `You'll keep ${tier} until ${activeUntil}, then move to LITE limits. Your verification stays on file — no need to verify again if you resubscribe.`
            : `You'll move to LITE limits when your current period ends. Your verification stays on file.`}
        </p>

        <Button
          onClick={handleCancel}
          disabled={cancelPlan.isPending}
          className="w-full h-13 mt-6 rounded-full bg-[#F04438] text-white font-bold disabled:opacity-60"
        >
          {cancelPlan.isPending ? 'Cancelling…' : `Cancel ${tier}`}
        </Button>

        <button
          type="button"
          onClick={close}
          className="w-full h-13 mt-2 rounded-full text-black font-bold"
        >
          Keep my plan
        </button>
      </div>
    </div>
  )
}
