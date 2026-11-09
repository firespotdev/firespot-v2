'use client'

import { useState } from 'react'
import {
  ActionList,
  Button,
  CircularIconButton,
  LoaderCircle,
  StatusCircle,
  showNotificationToast,
} from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  OutstandingEmptyState,
  OwingCustomerItem,
  useOutstandingCustomers,
  type OwingCustomer,
} from '@/components/outstanding'
import { useArchiveOutstandingSales } from '@/services/sales/hooks'

interface ArchiveOutstandingDrawerProps {
  closeDrawer: () => void
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? '' : 's'}`

// Paystack payments and collections settle through Firespot and stay active.
function archivableNote(customer: OwingCustomer) {
  if (customer.archivableCount === 0) return 'Paid through Firespot'
  if (customer.archivableCount < customer.transactionCount) {
    return `${customer.archivableCount} of ${plural(customer.transactionCount, 'transaction')} can be archived`
  }
  return undefined
}

function errorMessage(error: unknown) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || 'Could not archive these payments. Try again.'
  )
}

/** Pick which customers' outstanding payments to archive, then confirm. */
export function ArchiveOutstandingDrawer({
  closeDrawer,
}: ArchiveOutstandingDrawerProps) {
  const { customers, isLoading } = useOutstandingCustomers()
  const archive = useArchiveOutstandingSales()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const selected = customers.filter((customer) =>
    selectedIds.includes(customer.customerId),
  )
  const paymentCount = selected.reduce(
    (sum, customer) => sum + customer.archivableCount,
    0,
  )
  const whose =
    selected.length === 1
      ? selected[0].customerName
      : plural(selected.length, 'customer')

  const toggle = (customerId: string) =>
    setSelectedIds((ids) =>
      ids.includes(customerId)
        ? ids.filter((id) => id !== customerId)
        : [...ids, customerId],
    )

  const handleArchive = async () => {
    try {
      const result = await archive.mutateAsync(selectedIds)
      showNotificationToast({
        message: `${plural(result.count, 'outstanding payment')} archived`,
        mode: 'success',
      })
      closeDrawer()
    } catch (error: unknown) {
      showNotificationToast({ message: errorMessage(error), mode: 'error' })
    }
  }

  return (
    <div className="flex max-h-[80dvh] min-h-0 w-full flex-col font-satoshi">
      <header className="relative flex h-14 w-full shrink-0 items-center border-b border-gray-100 px-4 py-2">
        <div className="w-full text-center">
          <h2 className="text-[14px] font-bold leading-tight text-black">
            Archive outstanding
          </h2>
          <p className="text-xs font-medium text-[#6B7280]">
            Select the customers to archive
          </p>
        </div>
        <CircularIconButton
          icon="x"
          size="md"
          onClick={closeDrawer}
          className="absolute right-3 top-2.5"
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
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
                subtitle={archivableNote(customer)}
                disabled={customer.archivableCount === 0}
                trailing={
                  <StatusCircle
                    state={
                      selectedIds.includes(customer.customerId)
                        ? 'passed'
                        : 'empty'
                    }
                  />
                }
                onClick={() => toggle(customer.customerId)}
              />
            ))}
          </ActionList>
        )}
      </div>

      <footer className="shrink-0 border-t border-[#F1F1F1] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={selected.length === 0 || archive.isPending}
        >
          {selected.length > 0 ? `Archive (${selected.length})` : 'Archive'}
        </Button>
      </footer>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Archive outstanding payments?"
        description={`This will remove ${plural(paymentCount, 'outstanding payment')} for ${whose} from your active records.`}
        confirmLabel="Archive"
        variant="danger"
        isLoading={archive.isPending}
        onConfirm={handleArchive}
      />
    </div>
  )
}
