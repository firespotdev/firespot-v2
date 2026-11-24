'use client'

import { Archive, Bell, Plus, PlusCircle } from 'lucide-react'
import { ActionList, CircularIconButton, StatBanner } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { OutstandingActionPill } from './outstanding-action-pill'
import { OutstandingEmptyState } from './outstanding-empty-state'
import { OwingCustomerItem } from './owing-customer-item'
import type { OwingCustomer } from './use-outstanding-data'

// Two equal pills sharing the row, tightened so both labels stay on one line
// at phone widths.
const EVEN_PILL =
  'flex-1 justify-center gap-1.5 whitespace-nowrap px-2 tracking-[0.5px]'

interface OutstandingDashboardProps {
  totalOutstanding: number
  owingCustomers: OwingCustomer[]
  onSelectCustomer: (id: string) => void
  onClose: () => void
}

/** Every customer who owes the merchant, with the follow-up actions. */
export function OutstandingDashboard({
  totalOutstanding,
  owingCustomers,
  onSelectCustomer,
  onClose,
}: OutstandingDashboardProps) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const hasOwing = owingCustomers.length > 0
  const canArchive = owingCustomers.some(
    (customer) => customer.archivableCount > 0,
  )

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 justify-end px-4 py-2">
        <CircularIconButton icon="x" size="md" onClick={onClose} />
      </header>

      <div className="scrollbar-hide flex flex-1 flex-col overflow-y-auto px-4 pb-12">
        <h1 className="mt-2 mb-5 text-[32px] font-bold -tracking-[0.4px] text-black">
          Outstanding
        </h1>

        <StatBanner
          label="Total outstanding"
          amount={totalOutstanding}
          currency="₦"
          splitLayout
          actions={
            <div className="flex items-center gap-2">
              {canArchive && (
                <CircularIconButton
                  icon={<Archive size={20} strokeWidth={2} />}
                  size="lg"
                  variant="bordered"
                  aria-label="Archive outstanding payments"
                  onClick={() => openDrawer({ type: 'archive-outstanding' })}
                  className="bg-[#F4F6F8]"
                />
              )}
              <CircularIconButton
                icon={<Plus size={22} strokeWidth={2.5} />}
                size="lg"
                variant="filled"
                aria-label="New sale"
                onClick={() => openDrawer({ type: 'record-sale' })}
                className="bg-black text-white"
              />
            </div>
          }
        />

        {hasOwing && (
          <div className="mt-3 flex gap-2">
            <OutstandingActionPill
              icon={<Bell size={16} />}
              label="SEND OUT REMINDERS"
              className={EVEN_PILL}
              onClick={() =>
                openDrawer({
                  type: 'owing-customers',
                  props: { purpose: 'remind' },
                })
              }
            />
            <OutstandingActionPill
              icon={<PlusCircle size={16} />}
              label="RECORD REPAYMENT"
              className={EVEN_PILL}
              onClick={() =>
                openDrawer({
                  type: 'owing-customers',
                  props: { purpose: 'repay' },
                })
              }
            />
          </div>
        )}

        <div className="my-5 border-t border-[#F1F1F1]" />

        {hasOwing ? (
          <section>
            <h2 className="mb-3 text-sm font-bold text-black">
              {owingCustomers.length} customer
              {owingCustomers.length === 1 ? '' : 's'} owing you
            </h2>
            <ActionList rounded="16">
              {owingCustomers.map((customer) => (
                <OwingCustomerItem
                  key={customer.customerId}
                  customer={customer}
                  onClick={() => onSelectCustomer(customer.customerId)}
                />
              ))}
            </ActionList>
            <p className="my-6 text-center text-xs font-medium text-[#00000066]">
              You’ve reached the end of the list
            </p>
          </section>
        ) : (
          <div className="py-12">
            <OutstandingEmptyState />
          </div>
        )}
      </div>
    </div>
  )
}
