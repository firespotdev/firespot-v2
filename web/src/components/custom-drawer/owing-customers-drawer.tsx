'use client'

import { Bell } from 'lucide-react'
import {
  ActionList,
  CircularIconButton,
  LoaderCircle,
} from '@/components/ui'
import {
  OutstandingEmptyState,
  OwingCustomerItem,
  customerReminderSale,
  useOutstandingCustomers,
  type OwingCustomer,
} from '@/components/outstanding'
import { useDrawerStore } from '@/services/drawer'

type OwingCustomersPurpose = 'remind' | 'repay'

interface OwingCustomersDrawerProps {
  purpose: OwingCustomersPurpose
  closeDrawer: () => void
}

const COPY: Record<OwingCustomersPurpose, { title: string; hint: string }> = {
  remind: {
    title: 'Send reminders',
    hint: 'Texts go from your phone',
  },
  repay: {
    title: "Who's paying?",
    hint: 'Pick the customer repaying',
  },
}

function SendCapsule() {
  return (
    <span className="flex h-8 items-center gap-1.5 rounded-full bg-[#F1F1F1] px-3 text-[10px] font-bold tracking-[1px] text-black">
      <Bell size={14} strokeWidth={2} />
      SEND
    </span>
  )
}

/**
 * Customers who owe the merchant, opened from the Outstanding screen to send
 * each a reminder or to pick who is repaying. It stays open underneath, so
 * closing the reminder returns here for the next customer.
 */
export function OwingCustomersDrawer({
  purpose,
  closeDrawer,
}: OwingCustomersDrawerProps) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { customers, isLoading } = useOutstandingCustomers()
  const copy = COPY[purpose]

  const selectCustomer = (customer: OwingCustomer) =>
    openDrawer(
      purpose === 'remind'
        ? {
            type: 'send-reminder',
            props: { sale: customerReminderSale(customer) },
          }
        : {
            type: 'record-repayment',
            props: { customerId: customer.customerId },
          },
    )

  return (
    <div className="flex max-h-[80dvh] min-h-0 w-full flex-col font-satoshi">
      <header className="relative flex h-14 w-full shrink-0 items-center border-b border-gray-100 px-4 py-2">
        <div className="w-full text-center">
          <h2 className="text-[14px] font-bold leading-tight text-black">
            {copy.title}
          </h2>
          <p className="text-xs font-medium text-[#6B7280]">{copy.hint}</p>
        </div>
        <CircularIconButton
          icon="x"
          size="md"
          onClick={closeDrawer}
          className="absolute right-3 top-2.5"
        />
      </header>

      <div className="min-h-0 overflow-y-auto overscroll-contain px-3 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoaderCircle />
          </div>
        ) : customers.length === 0 ? (
          <div className="py-10">
            <OutstandingEmptyState />
          </div>
        ) : (
          <ActionList rounded="16">
            {customers.map((customer) => (
              <OwingCustomerItem
                key={customer.customerId}
                customer={customer}
                trailing={purpose === 'remind' ? <SendCapsule /> : undefined}
                onClick={() => selectCustomer(customer)}
              />
            ))}
          </ActionList>
        )}
      </div>
    </div>
  )
}
