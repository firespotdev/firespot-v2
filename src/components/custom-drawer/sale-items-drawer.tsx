'use client'

import { ChevronDown } from 'lucide-react'
import { useDrawerStore } from '@/services/drawer'
import type { SaleItem } from '@/services/sales/interface'

const formatAmount = (amount: number) =>
  amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export function SaleItemsDrawer({ items = [] }: { items: SaleItem[] }) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)

  return (
    <div className="w-full bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] font-satoshi">
      <div className="flex items-center justify-between border-b border-[#F1F1F1] py-3">
        <button
          type="button"
          onClick={() => closeDrawer('sale-items')}
          aria-label="Close items"
          className="flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ChevronDown className="h-5 w-5 text-black" />
        </button>
        <h2 className="text-base font-bold text-black">
          Items ({items.reduce((sum, item) => sum + (item.quantity || 1), 0)})
        </h2>
        <div className="h-9 w-9" />
      </div>

      <div className="max-h-[55dvh] overflow-y-auto py-2">
        {items.map((item, index) => {
          const quantity = item.quantity || 1
          const price = item.price || 0
          return (
            <div
              key={`${item.productId || item.productName || 'item'}-${index}`}
              className="flex items-start justify-between gap-4 border-b border-[#F1F1F1] py-4 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-black">
                  {item.productName || `Item ${index + 1}`}
                </p>
                <p className="mt-1 text-xs font-medium text-[#00000080]">
                  Quantity: {quantity}
                  {item.selectedVariant?.size
                    ? ` · Size: ${item.selectedVariant.size}`
                    : ''}
                  {item.selectedVariant?.color
                    ? ` · Color: ${item.selectedVariant.color}`
                    : ''}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-black">
                NGN {formatAmount(price * quantity)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
