'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, ChevronRight, Loader2 } from 'lucide-react'
import { Button, ClockFillIcon, Spinner } from '@/components/ui'
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
  const [selectedMethod, setSelectedMethod] = useState(paymentMethod)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (paymentMethod) {
      setSelectedMethod(paymentMethod)
    }
  }, [paymentMethod])

  // Build sales list to display
  const salesList =
    outstandingSales && outstandingSales.length > 0
      ? outstandingSales
      : sale
        ? [sale]
        : []

  const totalBalance = salesList.reduce((acc, s) => {
    const bal =
      s?.balanceOwed ??
      (s?.amount ? Math.max(0, s.amount - (s.amountPaid || 0)) : 0)
    return acc + bal
  }, 0)

  const remainingBalance = Math.max(0, totalBalance - effectiveAmount)

  // Sequential Waterfall allocation for preview
  let unallocated = effectiveAmount
  const displayItems = salesList.map((s: any) => {
    const saleBal =
      s?.balanceOwed ??
      (s?.amount ? Math.max(0, s.amount - (s.amountPaid || 0)) : 0)
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
      itemName =
        s.items.length === 1
          ? s.items[0].productName || s.items[0].name
          : `${s.items.length} items`
    }

    const dueDateObj = s?.dueDate
      ? new Date(s.dueDate)
      : new Date(s?.createdAt || Date.now())
    const daysLeft = differenceInDays(dueDateObj, new Date())
    const formattedDate = format(dueDateObj, 'MMM d, yyyy')

    const count = Math.max(1, daysLeft)
    let dueLabel = `Due in ${count} ${count === 1 ? 'Day' : 'Days'}`
    let isOverdue = false
    if (daysLeft < 0) {
      dueLabel = 'Overdue'
      isOverdue = true
    }

    const prevPaid =
      s?.amount && s?.balanceOwed !== undefined
        ? Math.max(0, s.amount - s.balanceOwed)
        : s?.amountPaid || 0
    const totalAmt = s?.amount || saleBal + prevPaid
    const totalPaidNow = prevPaid + allocated
    const progressPercentage =
      totalAmt > 0
        ? Math.min(
            100,
            Math.max(0, Math.round((totalPaidNow / totalAmt) * 100)),
          )
        : saleBal > 0
          ? Math.min(100, Math.max(0, Math.round((allocated / saleBal) * 100)))
          : 0

    return {
      name: itemName,
      amount: saleBal,
      allocated,
      date: formattedDate,
      dueLabel,
      isOverdue,
      statusType,
      progressPercentage,
    }
  })

  const handleOpenMethodDrawer = () => {
    openDrawer({
      type: 'payment-method',
      props: {
        currentMethod: selectedMethod,
        onSelectMethod: (method: string) => {
          setSelectedMethod(method)
          setPaymentMethod?.(method)
          openDrawer({
            type: 'repayment-summary',
            props: {
              sale,
              outstandingSales,
              effectiveAmount,
              customerName,
              paymentMethod: method,
              setPaymentMethod,
              onConfirmRecord,
              isLoading,
            },
          })
        },
        onSubmit: (method: string) => {
          setSelectedMethod(method)
          setPaymentMethod?.(method)
          openDrawer({
            type: 'repayment-summary',
            props: {
              sale,
              outstandingSales,
              effectiveAmount,
              customerName,
              paymentMethod: method,
              setPaymentMethod,
              onConfirmRecord,
              isLoading,
            },
          })
        },
      },
    })
  }

  const isBusy = isLoading || isSubmitting

  const handleRecordConfirm = async () => {
    if (isBusy || effectiveAmount <= 0 || effectiveAmount > totalBalance) return
    setIsSubmitting(true)
    try {
      await onConfirmRecord(effectiveAmount, selectedMethod)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full bg-white flex flex-col font-satoshi overflow-hidden">
      <div className="px-4 py-2 flex items-center justify-between border-b border-[#F1F1F1] shrink-0 relative">
        <div className="w-6" />
        <div className="flex flex-col items-center text-center flex-1">
          <h2 className="text-[14px] font-bold text-black mb-0.5">
            Record repayment
          </h2>
          <p className="text-[12px] font-medium text-[#6B7280]">
            NGN {formatCurrency(effectiveAmount)} from {customerName}
          </p>
        </div>
        <button onClick={() => closeDrawer()}>
          <X size={24} />
        </button>
      </div>

      <div className="px-3 py-2 overflow-y-auto flex-1">
        <div className="bg-[#F4F4F4] rounded-[12px] p-3 flex items-start gap-2 mb-2">
          <AlertCircle size={24} color="#00000066" />
          <p className="text-[12px] text-[#000000]/40 font-medium">
            Outstanding payments are cleared in order of how long they have been
            and how close the due date is.
          </p>
        </div>

        {/* <div className="px-1">
          <h3 className="text-[12px] font-medium text-[#00000066] mb-4">
            Unpaid balances
          </h3>

          <div className="space-y-4">
            {displayItems.map((item: any, idx: number) => (
              <div key={idx} className="flex flex-col gap-2">
                <div className="flex items-start gap-4 w-full pl-2">
                  {item.statusType === 'full' ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2Zm4.78 7.7-5.67 5.67a.75.75 0 0 1-1.06 0l-2.83-2.83a.754.754 0 0 1 0-1.06c.29-.29.77-.29 1.06 0l2.3 2.3 5.14-5.14c.29-.29.77-.29 1.06 0 .29.29.29.76 0 1.06Z"
                        fill="#24c166"
                      ></path>
                    </svg>
                  ) : item.statusType === 'partial' ? (
                    <ClockFillIcon size={24} />
                  ) : (
                    <div className="w-4.5 h-4.5 rounded-full border border-[#D0D5DD] shrink-0" />
                  )}

                  <div className="w-full">
                    <div className="flex">
                      <div className="w-full">
                        <p className="text-[13px] font-bold text-[#111827]">
                          {item.name}
                        </p>
                        <p className="text-[12px] font-medium text-[#6B7280] leading-none mt-1">
                          {item.date} . {item.dueLabel}
                        </p>
                      </div>
                      <p className="text-[13px] font-bold text-[#111827]">
                        ₦{formatCurrency(item.amount)}
                      </p>
                    </div>

                    <div className="w-full mt-3 h-1 bg-[#F3F4F6] rounded-[2px] overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-300 rounded-full',
                          item.statusType === 'full'
                            ? 'bg-[#24C166]'
                            : item.statusType === 'partial'
                              ? ''
                              : 'bg-transparent',
                        )}
                        style={{
                          width: `${item.progressPercentage}%`,
                          ...(item.statusType === 'partial'
                            ? {
                                background:
                                  'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
                              }
                            : {}),
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div> */}

        <div className="mx-1 border-t border-[#F1F1F1] pt-4 space-y-3 mt-4">
          <div className="flex items-center justify-between text-[14px]">
            <span className="font-medium text-[#00000080]">Paid now</span>
            <button
              type="button"
              className="flex items-center gap-1 font-bold text-[#24C166] cursor-pointer"
            >
              <span>NGN {formatCurrency(effectiveAmount)}</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between text-[14px]">
            <span className="font-medium text-[#00000080]">Still owing</span>
            <button
              type="button"
              className="flex items-center gap-1 font-bold cursor-pointer"
            >
              <span
                style={
                  remainingBalance > 0
                    ? {
                        background:
                          'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }
                    : { color: '#898A8D' }
                }
              >
                NGN {formatCurrency(remainingBalance)}
              </span>
              <ChevronRight
                size={16}
                className={
                  remainingBalance > 0 ? 'text-[#D72483]' : 'text-[#898A8D]'
                }
              />
            </button>
          </div>

          <div className="flex items-center justify-between text-[14px] border-t border-[#F1F1F1] pt-3 pb-2">
            <span className="font-medium text-[#00000080]">Method</span>
            <button
              type="button"
              onClick={handleOpenMethodDrawer}
              className="flex items-center gap-1 font-bold text-black hover:opacity-80 cursor-pointer"
            >
              <span>{selectedMethod}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Record CTA */}
      <div className="p-4 shrink-0 border-t border-[#F1F1F1] bg-white">
        <Button
          onClick={handleRecordConfirm}
          disabled={
            isBusy || effectiveAmount <= 0 || effectiveAmount > totalBalance
          }
          className="active:scale-[0.98]"
        >
          {isBusy ? (
            <Spinner />
          ) : (
            `Record NGN ${formatCurrency(effectiveAmount)}`
          )}
        </Button>
      </div>
    </div>
  )
}
