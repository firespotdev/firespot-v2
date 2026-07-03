'use client'

import { Check, Clock, X } from 'lucide-react'
import { Button, StatBanner } from '@/components/ui'
import { useRouter } from 'next/navigation'
import { useSalesStats } from '@/services/sales/hooks'
import { useDrawerStore } from '@/services/drawer'
import { formatCurrency } from '@/lib/utils'

interface RepaymentSuccessDrawerProps {
  sale: any
  effectiveAmount: number
  customerName: string
  isFullRepayment: boolean
  remainingBalance: number
  onDismiss?: () => void
}

export function RepaymentSuccessDrawer({
  sale,
  effectiveAmount,
  customerName,
  isFullRepayment,
  remainingBalance,
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
    openDrawer({
      type: 'send-reminder',
      props: { sale },
    })
  }

  const handleViewCustomer = () => {
    closeAllDrawers()
    router.push('/recents')
  }

  return (
    <div className="h-dvh w-full bg-white flex flex-col font-satoshi justify-between overflow-hidden relative">
      {/* Top Header */}
      <div className="flex justify-end p-4 shrink-0">
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-6 h-6 text-black" />
        </button>
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto pb-4">
        {/* Status Circle Icon */}
        {isFullRepayment ? (
          <div className="w-20 h-20 rounded-full border-4 border-[#24C166] flex items-center justify-center mb-6 bg-white shrink-0">
            <Check className="w-10 h-10 text-[#24C166]" strokeWidth={3} />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full border-4 border-[#BB8123] flex items-center justify-center mb-6 bg-white shrink-0">
            <Clock className="w-10 h-10 text-[#BB8123]" strokeWidth={2.5} />
          </div>
        )}

        {/* Title */}
        <h1 className="text-[22px] font-bold text-black text-center mb-2 leading-tight">
          {isFullRepayment ? 'Paid' : 'Partial payment recorded'}
        </h1>

        {/* Subtitle */}
        <p className="text-[14px] text-[#898A8D] font-medium text-center max-w-[320px] mb-8 leading-relaxed">
          {isFullRepayment
            ? `${customerName} has cleared her NGN ${formatCurrency(sale?.amount || effectiveAmount)} balance.`
            : `NGN ${formatCurrency(effectiveAmount)} received • NGN ${formatCurrency(remainingBalance)} still owed by ${customerName}`}
        </p>

        {/* Sales Stats Banner */}
        <div className="w-full max-w-[340px] mb-6">
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
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F4F6F8] hover:bg-gray-200 text-xs font-bold text-black uppercase tracking-wider transition-colors cursor-pointer mb-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>DETAILS</span>
        </button>
      </div>

      {/* Bottom CTA Buttons */}
      <div className="p-4 space-y-3 shrink-0 border-t border-[#F1F1F1] bg-white max-w-md mx-auto w-full">
        {isFullRepayment ? (
          <Button
            onClick={handleViewCustomer}
            className="w-full h-14 bg-black hover:bg-black/90 text-white rounded-full font-bold text-[15px] transition-transform active:scale-[0.98]"
          >
            View customer
          </Button>
        ) : (
          <Button
            onClick={handleSendReminder}
            className="w-full h-14 bg-black hover:bg-black/90 text-white rounded-full font-bold text-[15px] transition-transform active:scale-[0.98]"
          >
            Send reminder
          </Button>
        )}

        <Button
          variant="ghost"
          onClick={handleClose}
          className="w-full h-14 hover:bg-gray-50 bg-transparent text-black font-bold text-[15px] transition-colors"
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}
