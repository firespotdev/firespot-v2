'use client'

import { Clock, Check, ChevronRight, History, CircleCheck } from 'lucide-react'
import {
  StatBanner,
  AppCard,
  CircularIconButton,
  StatusBadge,
  Button,
  ClockGradientIcon,
} from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface CustomerDebtListProps {
  customerId: string
  customerName: string
  customerPhone: string
  customerTotalOwed: number
  unpaidSales: any[]
  repaidSales: any[]
  refetch: () => void
  onSelectSale: (id: string) => void
  onBack: () => void
}

export function CustomerDebtList({
  customerId,
  customerName,
  customerPhone,
  customerTotalOwed,
  unpaidSales,
  repaidSales,
  refetch,
  onSelectSale,
  onBack,
}: CustomerDebtListProps) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const unpaidCount = unpaidSales.length

  // Action to send reminder for overall total debt
  const handleSendAggregateReminder = () => {
    if (unpaidSales.length === 0) return

    // Simulate an aggregate sale object representing the client's overall debts
    const simulatedSale = {
      _id: unpaidSales[0]._id,
      customerId: unpaidSales[0].customerId,
      amount: customerTotalOwed,
      amountPaid: 0,
      balanceOwed: customerTotalOwed,
      description: `Sale for ${customerName}`,
      reference: unpaidSales[0].reference || 'repayment',
      recordedAt: new Date(),
      createdAt: new Date(),
      status: 'OUTSTANDING',
    }

    openDrawer({
      type: 'send-reminder',
      props: {
        sale: simulatedSale,
      },
    })
  }

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between py-2 px-3">
        <CircularIconButton icon="arrow-left" size="md" onClick={onBack} />

        <div className="text-center flex-1 mx-2">
          <h2 className="text-[14px] font-bold text-black leading-tight truncate max-w-50 mx-auto">
            {customerName}
          </h2>
          <p className="text-xs text-[#6B7280] font-medium">
            {unpaidCount} payment{unpaidCount !== 1 ? 's' : ''} outstanding
          </p>
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M3 7h18M6 12h12M10 17h4"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinecap="round"
          ></path>
        </svg>
      </header>

      <div className="flex-1 px-3 pb-10 overflow-y-auto flex flex-col gap-4">
        {/* Total Owed Banner */}
        <div className="relative">
          <StatBanner
            label="Total owed to you"
            amount={customerTotalOwed}
            currency="₦"
            className="px-4 py-3.5"
          />
          <button
            onClick={refetch}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[#6B7280] transition-colors"
          >
            <History size={20} />
          </button>
        </div>

        {/* Record / Remind button layout */}
        {customerTotalOwed > 0 && (
          <div className="grid grid-cols-2 gap-3 w-full shrink-0 mb-2">
            <Button asChild className="w-full text-sm h-9">
              <Link href={`/record-repayment?customerId=${customerId}`}>
                Record repayment
              </Link>
            </Button>

            <Button
              onClick={handleSendAggregateReminder}
              variant="default"
              className="w-full h-9 text-sm bg-[#00000008] text-black font-bold border-none"
            >
              Send reminder
            </Button>
          </div>
        )}

        {/* Unpaid Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-black px-1">Unpaid</h3>
          {unpaidSales.length > 0 ? (
            <AppCard rounded="16" divided className="flex flex-col">
              {unpaidSales.map((sale: any) => {
                const saleOwed =
                  sale.balanceOwed ??
                  (sale.amount
                    ? Math.max(0, sale.amount - (sale.amountPaid || 0))
                    : 0)
                const desc =
                  sale.description ||
                  `${sale.items?.length || 0} item${sale.items?.length !== 1 ? 's' : ''}`
                const dateText = sale.dueDate
                  ? `Due on ${new Date(sale.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : 'No due date'

                return (
                  <button
                    key={sale._id}
                    onClick={() => onSelectSale(sale._id)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#FEEDEA] flex items-center justify-center shrink-0">
                        <ClockGradientIcon size={20} strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-[#111827] line-clamp-1">
                          {desc}
                        </h4>
                        <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                          {dateText}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-[13px] font-bold text-[#111827]">
                          ₦{formatCurrency(saleOwed)}
                        </span>
                        <StatusBadge status="OUTSTANDING" variant="text" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#C1C1C1]" />
                    </div>
                  </button>
                )
              })}
            </AppCard>
          ) : (
            <AppCard
              rounded="16"
              padding="md"
              className="text-center text-xs text-[#00000066]"
            >
              No unpaid payments.
            </AppCard>
          )}
        </div>

        {/* Repaid Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-black px-1">Repaid</h3>
          {repaidSales.length > 0 ? (
            <AppCard rounded="16" divided className="flex flex-col">
              {repaidSales.map((sale: any) => {
                const salePaid = sale.amountPaid ?? sale.amount ?? 0
                const desc =
                  sale.description ||
                  `${sale.items?.length || 0} item${sale.items?.length !== 1 ? 's' : ''}`
                const dateText = new Date(
                  sale.recordedAt || sale.createdAt,
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <button
                    key={sale._id}
                    onClick={() => onSelectSale(sale._id)}
                    className="w-full flex items-center justify-between p-3 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#24C166]/10 flex items-center justify-center text-[#24C166] shrink-0">
                        <CircleCheck size={20} strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-[#111827] line-clamp-1">
                          {desc}
                        </h4>
                        <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                          {dateText}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-[13px] font-bold text-[#111827]">
                          ₦{formatCurrency(salePaid)}
                        </span>
                        <span className="text-[11px] font-medium text-[#24C166]">
                          Paid
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#C1C1C1]" />
                    </div>
                  </button>
                )
              })}
            </AppCard>
          ) : (
            <AppCard
              rounded="16"
              padding="md"
              className="text-center text-xs text-[#00000066] mb-8"
            >
              No repayments recorded yet.
            </AppCard>
          )}
        </div>

        <p className="text-xs font-medium text-[#0000004D] text-center w-full shrink-0 my-4">
          You've reached the end of the list
        </p>
      </div>
    </div>
  )
}
