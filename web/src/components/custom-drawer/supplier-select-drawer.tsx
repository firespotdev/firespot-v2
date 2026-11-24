'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { ActionList, ActionListItem, Skeleton } from '@/components/ui'
import { MerchantAvatar } from '@/components/layout/MerchantAvatar'
import { AddSupplierCard } from '@/components/expenses/add-supplier-card'
import { useDrawerStore } from '@/services/drawer'
import { useSuppliers, type Supplier } from '@/services/expenses'

interface Props {
  /** Called with the chosen supplier, or null when skipped. */
  onSelect: (supplier: Supplier | null) => void
  onBack?: () => void
}

export function SupplierSelectDrawer({ onSelect, onBack }: Props) {
  const { closeDrawer, closeAllDrawers, openDrawer } = useDrawerStore()
  const { data: suppliers = [], isLoading, isError, refetch } = useSuppliers()
  const [search, setSearch] = useState('')

  const query = search.trim().toLowerCase()
  const filtered = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(query) ||
      supplier.phoneNumber.includes(query),
  )

  const handleAddSupplier = () => {
    closeDrawer('supplier-select')
    openDrawer({
      type: 'add-supplier',
      props: {
        onSaved: onSelect,
        onBack: () => {
          closeDrawer('add-supplier')
          openDrawer({ type: 'supplier-select', props: { onSelect, onBack } })
        },
      },
    })
  }

  return (
    <div className="mx-auto w-full max-w-125 overflow-y-auto overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] font-satoshi">
      <div className="flex flex-col gap-3 py-2">
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="px-2 py-2 text-sm font-medium text-black underline underline-offset-4"
          >
            Skip
          </button>
          <h2 className="flex-1 text-center text-[16px] font-bold text-black">
            Who did you pay?
          </h2>
          <button
            type="button"
            onClick={onBack ?? closeAllDrawers}
            aria-label={onBack ? 'Back' : 'Close'}
            className="flex cursor-pointer items-center justify-center rounded-full p-2 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-black" />
          </button>
        </div>

        <label className="flex items-center rounded-full border border-[#EBEBEB] bg-[#E6E8EB99] px-3 py-2 transition-colors focus-within:border-gray-300">
          <Search className="mr-2 h-4 w-4 text-[#00000066]" aria-hidden />
          <span className="sr-only">Search suppliers</span>
          <input
            type="text"
            placeholder="Search suppliers"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="flex-1 bg-transparent text-sm font-medium text-black placeholder-[#00000066] focus:outline-none"
          />
        </label>

        <AddSupplierCard onClick={handleAddSupplier} />

        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-14 w-full rounded-[12px]" />
          </div>
        ) : isError ? (
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-[12px] bg-white p-4 text-left text-sm font-medium text-[#FF3B30]"
          >
            Couldn&apos;t load your suppliers. Tap to try again.
          </button>
        ) : (
          suppliers.length > 0 && (
            <div>
              <span className="mb-2 inline-block px-0.5 text-[13px] font-medium text-[#00000066]">
                {filtered.length} {filtered.length === 1 ? 'supplier' : 'suppliers'}
              </span>
              <ActionList rounded="12" className="max-h-72 overflow-y-auto">
                {filtered.map((supplier) => (
                  <ActionListItem
                    key={supplier._id}
                    icon={<MerchantAvatar alt={supplier.name} />}
                    title={supplier.name}
                    subtitle={supplier.phoneNumber}
                    onClick={() => onSelect(supplier)}
                    className="p-3"
                  />
                ))}
              </ActionList>
            </div>
          )
        )}
      </div>
    </div>
  )
}
