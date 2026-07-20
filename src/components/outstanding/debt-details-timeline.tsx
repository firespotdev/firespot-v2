'use client'

import { Bell, Pencil, Check, Clock, PenLine } from 'lucide-react'
import {
  StatBanner,
  AppCard,
  CircularIconButton,
  Button,
  ClockFillIcon,
} from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { formatCurrency } from '@/lib/utils'
import { Sale } from '@/services/sales/interface'
import Link from 'next/link'

interface DebtDetailsTimelineProps {
  sale: Sale
  saleOwedAmount: number
  saleRepayments: Array<{
    amount: number
    paymentMethod: string
    recordedAt?: string | Date
  }>
  onBack: () => void
}

export function DebtDetailsTimeline({
  sale,
  saleOwedAmount,
  saleRepayments,
  onBack,
}: DebtDetailsTimelineProps) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const formattedSaleDate = new Date(
    sale.recordedAt || sale.createdAt,
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const handleRemindClick = () => {
    openDrawer({
      type: 'send-reminder',
      props: {
        sale,
      },
    })
  }

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between py-2 px-3 sticky top-0 z-50 bg-[#F4F6F8]">
        <CircularIconButton icon="arrow-left" size="md" onClick={onBack} />
        <h2 className="text-base font-bold text-[#000000]">Debt details</h2>
        <div className="w-6 h-4"></div>
      </header>

      <div className="flex-1 px-3 pt-4 pb-20 overflow-y-auto flex flex-col gap-4">
        {/* Total Owed Banner */}
        <div className="relative">
          <StatBanner
            label="Total owed to you"
            amount={saleOwedAmount}
            currency="₦"
            className="py-3.5 px-4"
          />
          {saleOwedAmount > 0 && (
            <button
              onClick={handleRemindClick}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3.5 py-2.5 bg-[#F1F1F1] rounded-4xl text-[10px] tracking-[1px] font-bold text-black"
            >
              <Bell size={16} strokeWidth={2} />
              <span>REMIND</span>
            </button>
          )}
        </div>

        {/* Timeline Card */}
        <AppCard
          rounded="12"
          padding="md"
          className="flex flex-col border border-[#f1f1f1] pb-0"
        >
          {/* 1. Sale Recorded */}
          <div className="flex gap-2">
            <div className="flex flex-col items-center">
              <div className="w-5.5 h-5.5 rounded-[22px] flex items-center justify-center">
                <PenLine size={15} color="#6B7280" />
              </div>
              {/* Dotted Line */}
              <div className="w-[1.5px] flex-1 min-h-6 border-l border-dashed border-[#9CA3AF] my-1" />
            </div>
            <div className="flex-1 pb-4 flex justify-between items-start">
              <div>
                <h4 className="text-[14px] font-medium text-[#000000]">
                  Sale recorded
                </h4>
                <p className="text-[14px] text-[#00000080] font-medium mt-0.5">
                  {formattedSaleDate} . {sale.items?.length || 0} items
                </p>
              </div>
              <span className="text-[14px] font-medium text-[#000000]">
                NGN {formatCurrency(sale.amount ?? 0)}
              </span>
            </div>
          </div>

          {/* 2. Repayments (if any) */}
          {saleRepayments.map((rep, idx) => {
            const repDate = new Date(
              rep.recordedAt || Date.now(),
            ).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })

            return (
              <div key={idx} className="flex gap-2">
                <div className="flex flex-col items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2Zm4.78 7.7-5.67 5.67a.75.75 0 0 1-1.06 0l-2.83-2.83a.754.754 0 0 1 0-1.06c.29-.29.77-.29 1.06 0l2.3 2.3 5.14-5.14c.29-.29.77-.29 1.06 0 .29.29.29.76 0 1.06Z"
                      fill="#24C166"
                    ></path>
                  </svg>
                  {/* Dotted Line */}
                  {(idx < saleRepayments.length - 1 || saleOwedAmount > 0) && (
                    <div className="w-[1.5px] flex-1 min-h-6 border-l border-dashed border-[#9CA3AF] my-1" />
                  )}
                </div>
                <div className="flex-1 pb-4 flex justify-between items-start">
                  <div>
                    <h4 className="text-[14px] font-medium text-[#000000]">
                      Paid . {rep.paymentMethod?.toLowerCase()}
                    </h4>
                    <p className="text-[14px] text-[#00000080] font-medium mt-0.5">
                      {repDate} .{' '}
                      {idx === 0 && sale.amountPaid === rep.amount && 'at sale'}
                    </p>
                  </div>
                  <span className="text-[14px] font-bold text-[#24C166]">
                    + NGN {formatCurrency(rep.amount)}
                  </span>
                </div>
              </div>
            )
          })}

          {/* 3. Current Outstanding (if balance > 0) */}
          {saleOwedAmount > 0 && (
            <div className="flex gap-2 pb-4">
              <ClockFillIcon size={22} />
              <div className="flex-1 flex justify-between items-start">
                <div>
                  <h4 className="text-[14px] font-medium text-[#000000]">
                    Outstanding
                  </h4>
                  <p className="text-[14px] text-[#00000080] font-medium mt-0.5">
                    {sale.dueDate
                      ? `Due on ${new Date(sale.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : 'No due date'}
                  </p>
                </div>
                <span
                  className="text-[14px] font-bold"
                  style={{
                    background:
                      'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  + NGN {formatCurrency(saleOwedAmount)}
                </span>
              </div>
            </div>
          )}
        </AppCard>
      </div>

      {/* Bottom record button */}
      {saleOwedAmount > 0 && (
        <div className="border-t border-[#F1F1F1] mx-auto fixed bottom-0 left-0 right-0 bg-white max-w-125">
          <div className="p-4">
            <Button asChild className="w-full">
              <Link href={`/record-repayment?id=${sale._id}`}>
                Record repayment
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
