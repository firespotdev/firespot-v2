'use client'

import { useAuthStore } from '@/services/auth'
import { useCustomerActions } from '@/services/customer-actions'
import { useDrawerStore } from '@/services/drawer'
import { CustomerActionRows } from './customer-action-rows'

export function NeedsYouSection() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data, isLoading, isError } = useCustomerActions(isAuthenticated)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const actions = data?.data || []

  if (!isAuthenticated || isLoading || isError || actions.length === 0) {
    return null
  }

  return (
    <section className="mb-6 rounded-[16px] border-2 border-[#F1F1F1] bg-white p-4 shadow-[0px_4px_8px_0px_#0000000A]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-black">Needs you</h3>
        {actions.length > 3 && (
          <button
            type="button"
            onClick={() => openDrawer({ type: 'customer-actions' })}
            className="text-xs font-medium text-black underline underline-offset-3"
          >
            View all
          </button>
        )}
      </div>

      <CustomerActionRows actions={actions.slice(0, 3)} />
    </section>
  )
}
