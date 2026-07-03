'use client'

import { useState } from 'react'
import { X, Check, Clock, AlertCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { formatCurrency, cn } from '@/lib/utils'
import { format, differenceInDays } from 'date-fns'

interface RepaymentSummaryDrawerProps {
  sale?: any
  outstandingSales?: any[]
  effectiveAmount: number
  customerName: string
  paymentMethod: string
  setPaymentMethod: (method: string) => void
  onConfirmRecord: (amount: number, method: string) => void
  isLoading?: boolean
}

export function RepaymentSummaryDrawer({
  sale,
  outstandingSales = [],
  effectiveAmount,
  customerName,
  paymentMethod,
  setPaymentMethod,
  onConfirmRecord,
  isLoading = false,
}: RepaymentSummaryDrawerProps) {
  const { openDrawer, closeDrawer } = useDrawerStore()

  // Build sales list to display
  const salesList = outstandingSales && outstandingSales.length > 0
    ? outstandingSales
    : sale
    ? [sale]
    : []

  const totalBalance = salesList.reduce((acc, s) => {
    const bal = s?.balanceOwed ?? (s?.amount ? Math.max(0, s.amount - (s.amountPaid || 0)) : 0)
    return acc + bal
  }, 0)

  const remainingBalance = Math.max(0, totalBalance - effectiveAmount)

  // Sequential Waterfall allocation for preview
  let unallocated = effectiveAmount
  const displayItems = salesList.map((s: any) => {
    const saleBal = s?.balanceOwed ?? (s?.amount ? Math.max(0, s.amount - (s.amountPaid || 0)) : 0)
    const allocated = Math.min(unallocated, saleBal)
    unallocated -= allocated

    let statusType: 'full' | 'partial' | 'none' = 'none'
    if (allocated >= saleBal && saleBal > 0) {
      statusType = 'full'
    } else if (allocated > 0) {
      statusType = 'partial'
    }

    // Item name
    let itemName = s?.description || 'Outstanding balance'
    if (s?.items && s.items.length > 0) {
      itemName = s.items.length === 1
        ? s.items[0].productName || s.items[0].name
        : `${s.items.length} items`
    }

    const dueDateObj = s?.dueDate ? new Date(s.dueDate) : new Date(s?.createdAt || Date.now())
    const daysLeft = differenceInDays(dueDateObj, new Date())
    const formattedDate = format(dueDateObj, 'MMM d, yyyy')

    let dueLabel = `Due in ${Math.max(1, daysLeft)} days`
    let isOverdue = false
    if (daysLeft < 0) {
      dueLabel = 'Overdue'
      isOverdue = true
    }

    return {
      name: itemName,
      amount: saleBal,
      allocated,
      date: formattedDate,
      dueLabel,
      isOverdue,
      statusType,
    }
  })

  const handleOpenMethodDrawer = () => {
    openDrawer({
      type: 'payment-method',
      props: {
        currentMethod: paymentMethod,
        onSelectMethod: (method: string) => {
          setPaymentMethod(method)
        },
      },
    })
  }

  return (
    <div className="w-full bg-white flex flex-col font-satoshi max-h-[85vh] rounded-t-[32px] overflow-hidden pb-6">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#F1F1F1] shrink-0 relative">
        <div className="w-8" />
        <div className="flex flex-col items-center text-center flex-1">
          <h2 className="text-[16px] font-bold text-black leading-tight">Record repayment</h2>
          <p className="text-[13px] font-medium text-[#8E8E93]">
            NGN {formatCurrency(effectiveAmount)} from {customerName}
          </p>
        </div>
        <button
          onClick={() => closeDrawer()}
          className="w-8 h-8 rounded-full bg-[#F4F6F8] flex items-center justify-center text-black hover:bg-gray-200 transition-colors shrink-0 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto flex-1">
        {/* Info Alert Banner */}
        <div className="bg-[#F4F6F8] rounded-[16px] p-4 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full border border-[#8E8E93] flex items-center justify-center text-[#8E8E93] shrink-0 mt-0.5">
            <span className="text-[11px] font-bold italic font-serif">i</span>
          </div>
          <p className="text-[13px] text-[#555555] font-medium leading-snug">
            Outstanding payments are cleared in order of how long they have been and how close the due date is.
          </p>
        </div>

        {/* Section Header */}
        <div>
          <h3 className="text-[13px] font-bold text-[#898A8D] mb-3 uppercase tracking-wider">
            Unpaid balances
          </h3>

          <div className="space-y-4">
            {displayItems.map((item: any, idx: number) => (
              <div key={idx} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.statusType === 'full' ? (
                      <div className="w-6 h-6 rounded-full bg-[#24C166] text-white flex items-center justify-center shrink-0">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    ) : item.statusType === 'partial' ? (
                      <div className="w-6 h-6 rounded-full bg-[#D97706] text-white flex items-center justify-center shrink-0">
                        <Clock size={14} strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-[#D1D5DB] shrink-0" />
                    )}

                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-black truncate leading-tight">
                        {item.name}
                      </p>
                      <p className="text-[12px] font-medium text-[#898A8D] leading-tight mt-0.5">
                        {item.date} .{' '}
                        <span className={item.isOverdue ? 'text-[#FF3B30] font-bold' : 'text-[#898A8D]'}>
                          {item.dueLabel}
                        </span>
                      </p>
                    </div>
                  </div>

                  <p className="text-[15px] font-bold text-black shrink-0 font-sofia-pro">
                    ₦{formatCurrency(item.amount)}
                  </p>
                </div>

                {/* Progress bar line */}
                <div className="w-full h-1.5 bg-[#F4F6F8] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-300 rounded-full',
                      item.statusType === 'full'
                        ? 'bg-[#24C166] w-full'
                        : item.statusType === 'partial'
                        ? 'bg-[#D97706] w-1/2'
                        : 'bg-transparent w-0'
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Rows */}
        <div className="border-t border-[#F1F1F1] pt-4 space-y-3">
          <div className="flex items-center justify-between text-[14px]">
            <span className="font-medium text-[#898A8D]">Paid now</span>
            <button
              type="button"
              className="flex items-center gap-1 font-bold text-[#24C166] cursor-pointer"
            >
              <span>NGN {formatCurrency(effectiveAmount)}</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between text-[14px]">
            <span className="font-medium text-[#898A8D]">Still owing</span>
            <button
              type="button"
              className={cn(
                'flex items-center gap-1 font-bold cursor-pointer',
                remainingBalance > 0 ? 'text-[#D97706]' : 'text-[#898A8D]'
              )}
            >
              <span>NGN {formatCurrency(remainingBalance)}</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between text-[14px]">
            <span className="font-medium text-[#898A8D]">Method</span>
            <button
              type="button"
              onClick={handleOpenMethodDrawer}
              className="flex items-center gap-1 font-bold text-black hover:opacity-80 cursor-pointer"
            >
              <span>{paymentMethod}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Record CTA */}
      <div className="p-4 shrink-0 border-t border-[#F1F1F1] bg-white">
        <Button
          onClick={() => onConfirmRecord(effectiveAmount, paymentMethod)}
          disabled={isLoading || effectiveAmount <= 0}
          className="w-full h-14 bg-black hover:bg-black/90 text-white rounded-full font-bold text-[15px] shadow-lg transition-transform active:scale-[0.98]"
        >
          {isLoading ? 'Recording...' : `Record NGN ${formatCurrency(effectiveAmount)}`}
        </Button>
      </div>
    </div>
  )
}
