'use client'

import { Check, X } from 'lucide-react'
import { Button, ClockGradientIcon, StatBanner } from '@/components/ui'
import { useRouter } from '@bprogress/next/app'
import { useSalesStats } from '@/services/sales/hooks'
import type { Sale } from '@/services/sales/interface'
import { useDrawerStore } from '@/services/drawer'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface RepaymentSuccessDrawerProps {
  sale: Sale
  reminderSale?: Sale
  effectiveAmount: number
  customerName: string
  paymentMethod: string
  recordedAt: string | Date
  isFullRepayment: boolean
  remainingBalance: number
  returnTo?: string
  onDismiss?: () => void
}

export function RepaymentSuccessDrawer({
  sale,
  reminderSale,
  effectiveAmount,
  customerName,
  paymentMethod,
  recordedAt,
  isFullRepayment,
  remainingBalance,
  returnTo,
  onDismiss,
}: RepaymentSuccessDrawerProps) {
  const router = useRouter()
  const { openDrawer, closeAllDrawers } = useDrawerStore()
  const { data: statsData, isLoading: isLoadingStats } = useSalesStats()

  const todaySalesAmount = statsData?.todaySalesAmount ?? 0

  const handleClose = () => {
    closeAllDrawers()
    if (onDismiss) {
      onDismiss()
    } else {
      router.push('/recents')
    }
  }

  const handleSendReminder = () => {
    closeAllDrawers()
    if (returnTo) {
      router.replace(returnTo)
    }
    openDrawer({
      type: 'send-reminder',
      props: { sale: reminderSale || sale },
    })
  }

  const handleViewCustomer = () => {
    closeAllDrawers()
    if (returnTo) {
      router.replace(returnTo)
      return
    }
    router.push('/recents')
  }

  const repaymentDate = (() => {
    try {
      return format(
        new Date(recordedAt),
        "EEEE do 'of' MMMM, yyyy 'at' h:mm a",
      )
    } catch {
      return 'the recorded time'
    }
  })()

  return (
    <div className="h-dvh w-full bg-[#f4f6f8] flex flex-col font-satoshi justify-between overflow-hidden relative">
      <div className="flex justify-end p-4 shrink-0">
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-6 h-6 text-black" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
        {isFullRepayment ? (
          <div className="w-18 h-18 rounded-full border-4 border-[#24C166] flex items-center justify-center mb-2">
            <Check className="w-9 h-9 text-[#24C166]" strokeWidth={3} />
          </div>
        ) : (
          <ClockGradientIcon />
        )}

        {/* Title */}
        <h1 className="text-[20px] font-bold text-black text-center mb-1 mt-4 leading-none -tracking-[0.4px]">
          {isFullRepayment
            ? 'Full payment recorded'
            : 'Partial payment recorded'}
        </h1>

        {/* Subtitle */}
        <p className="text-[14px] text-[#00000080] font-medium text-center mb-6 leading-relaxed">
          {isFullRepayment
            ? `${paymentMethod} repayment of NGN ${formatCurrency(effectiveAmount)} recorded on ${repaymentDate}. ${customerName} has cleared the outstanding balance.`
            : `${paymentMethod} repayment of NGN ${formatCurrency(effectiveAmount)} recorded on ${repaymentDate}. NGN ${formatCurrency(remainingBalance)} still owed by ${customerName}.`}
        </p>

        {/* Sales Stats Banner */}
        <div className="w-full mb-6">
          <StatBanner
            label="Total sales recorded today"
            amount={todaySalesAmount}
            badgeText={`+NGN ${formatCurrency(effectiveAmount)}`}
            badgePositive={true}
            isLoading={isLoadingStats}
          />
        </div>

      </div>

      {/* Bottom CTA Buttons */}
      <div className="p-3 space-y-3 shrink-0 border-t border-[#F1F1F1] bg-white max-w-md mx-auto w-full">
        {isFullRepayment ? (
          <Button onClick={handleViewCustomer} className="active:scale-[0.98]">
            View customer
          </Button>
        ) : (
          <Button onClick={handleSendReminder} className="active:scale-[0.98]">
            Send reminder
          </Button>
        )}

        <Button
          variant="ghost"
          onClick={handleClose}
          className="w-full hover:bg-gray-50 bg-transparent text-black font-bold transition-colors"
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}
