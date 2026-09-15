'use client'

import { X } from 'lucide-react'
import { CustomerActionRows } from '@/components/activity/customer-action-rows'
import { LoaderCircle, TagFooter } from '@/components/ui'
import { useCustomerActions } from '@/services/customer-actions'
import { useDrawerStore } from '@/services/drawer'

interface CustomerActionsDrawerProps {
  closeDrawer: () => void
}

export function CustomerActionsDrawer({
  closeDrawer,
}: CustomerActionsDrawerProps) {
  const closeAllDrawers = useDrawerStore((state) => state.closeAllDrawers)
  const { data, isLoading, isError } = useCustomerActions()
  const actions = data?.data || []

  return (
    <div className="flex min-h-0 flex-col bg-white font-satoshi">
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-[#F1F1F1] px-4">
        <span className="h-9 w-9" aria-hidden="true" />
        <h2 className="text-[17px] font-bold text-black">Needs you</h2>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close"
          className="grid h-9 w-9 place-items-center rounded-full active:bg-black/5"
        >
          <X size={20} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoaderCircle />
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm font-medium text-[#00000099]">
            Couldn’t load your actions. Try again later.
          </p>
        ) : actions.length === 0 ? (
          <p className="py-10 text-center text-sm font-medium text-[#00000099]">
            Nothing needs your attention right now.
          </p>
        ) : (
          <CustomerActionRows
            actions={actions}
            onNavigate={closeAllDrawers}
          />
        )}
      </div>
      <TagFooter />
    </div>
  )
}
