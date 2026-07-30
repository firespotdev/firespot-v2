'use client'

import { Check, Clock, Receipt, X } from 'lucide-react'
import { Button, ClockGradientIcon, StatBanner } from '@/components/ui'
import { useRouter } from 'next/navigation'
import { useSalesStats } from '@/services/sales/hooks'
import { useDrawerStore } from '@/services/drawer'
import { formatCurrency } from '@/lib/utils'

interface RepaymentSuccessDrawerProps {
  sale: any
  reminderSale?: any
  effectiveAmount: number
  customerName: string
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
    router.push(returnTo || '/recents')
  }

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
            ? `${customerName} has cleared her NGN ${formatCurrency(sale?.amount || effectiveAmount)} balance.`
            : `NGN ${formatCurrency(effectiveAmount)} received • NGN ${formatCurrency(remainingBalance)} still owed by ${customerName}`}
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

        {/* Details Pill Button */}
        <button
          onClick={() => {
            closeAllDrawers()
            openDrawer({
              type: 'transaction-details',
              props: { sale },
            })
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 border border-[#0000000A] shadow-[0px_2px_4px_0px_#0000000A] rounded-full bg-[#0000000A] text-[10px] font-bold text-black uppercase tracking-[1px] transition-colors cursor-pointer mb-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M22 6v2.42C22 10 21 11 19.42 11H16V4.01C16 2.9 16.91 2 18.02 2c1.09.01 2.09.45 2.81 1.17C21.55 3.9 22 4.9 22 6Z"
              stroke="#000000"
              strokeWidth="1.5"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
            <path
              d="M2 7v14c0 .83.94 1.3 1.6.8l1.71-1.28c.4-.3.96-.26 1.32.1l1.66 1.67c.39.39 1.03.39 1.42 0l1.68-1.68c.35-.35.91-.39 1.3-.09l1.71 1.28c.66.49 1.6.02 1.6-.8V4c0-1.1.9-2 2-2H6C3 2 2 3.79 2 6v1Z"
              stroke="#000000"
              strokeWidth="1.5"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
            <path
              d="M6.25 10h5.5"
              stroke="#000000"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
          </svg>
          <span>DETAILS</span>
        </button>
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
