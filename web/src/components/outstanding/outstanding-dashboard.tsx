'use client'

import { ChevronRight } from 'lucide-react'
import { StatBanner, AppCard, CircularIconButton } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { MerchantAvatar } from '../layout/MerchantAvatar'

export interface OwingCustomer {
  customerId: string
  customerName: string
  customerPhone: string
  customerAvatar?: string
  transactionCount: number
  totalOwed: number
}

interface OutstandingDashboardProps {
  totalOutstanding: number
  owingCustomers: OwingCustomer[]
  onSelectCustomer: (id: string) => void
  onBack: () => void
}

export function OutstandingDashboard({
  totalOutstanding,
  owingCustomers,
  onSelectCustomer,
  onBack,
}: OutstandingDashboardProps) {
  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between py-2 px-3">
        <CircularIconButton icon="arrow-left" size="md" onClick={onBack} />

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

      <div className="flex-1 px-4 pb-12 overflow-y-auto flex flex-col gap-3">
        <h3 className="text-[32px] font-bold text-black mt-2 -tracking-[0.4px] mb-3 pb-2">
          Outstanding
        </h3>
        <StatBanner
          label="Total payments outstanding"
          amount={totalOutstanding}
          currency="₦"
        />

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-black mt-2">
            {owingCustomers.length} customer
            {owingCustomers.length !== 1 ? 's' : ''} owing you
          </h3>

          {owingCustomers.length > 0 ? (
            <AppCard rounded="16" divided className="flex flex-col">
              {owingCustomers.map((customer) => {
                return (
                  <button
                    key={customer.customerId}
                    onClick={() => onSelectCustomer(customer.customerId)}
                    className="w-full flex items-center justify-between p-3 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <MerchantAvatar
                        profilePhotoUrl={customer.customerAvatar}
                      />

                      <div>
                        <h4 className="text-[14px] font-bold text-[#111827] line-clamp-1">
                          {customer.customerName}
                        </h4>
                        <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                          {customer.transactionCount} transaction
                          {customer.transactionCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[13px] font-bold text-[#111827]">
                        ₦{formatCurrency(customer.totalOwed)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#C1C1C1]" />
                    </div>
                  </button>
                )
              })}
            </AppCard>
          ) : (
            <AppCard
              rounded="16"
              padding="lg"
              className="text-center text-[#00000066] text-xs"
            >
              All caught up! No customers owe you.
            </AppCard>
          )}
        </div>

        {owingCustomers.length > 0 && (
          <p className="text-xs font-medium text-[#00000066] text-center w-full shrink-0 my-4">
            You’ve reached the end of the list
          </p>
        )}
      </div>
    </div>
  )
}
