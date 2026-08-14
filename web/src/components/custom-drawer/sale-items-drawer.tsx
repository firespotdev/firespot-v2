'use client'

import { Image as ImageIcon, X } from 'lucide-react'
import { useDrawerStore } from '@/services/drawer'
import type { SaleItem } from '@/services/sales/interface'

const formatAmount = (amount: number) =>
  amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export function SaleItemsDrawer({ items = [] }: { items: SaleItem[] }) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const itemCount = items.length

  return (
    <div className="flex max-h-[80dvh] w-full flex-col bg-white font-satoshi">
      <header className="flex shrink-0 items-center justify-between border-b border-[#F1F1F1] px-4 py-3">
        <span className="h-9 w-9" aria-hidden="true" />
        <h2 className="text-[16px] font-bold text-black">
          Items ({itemCount})
        </h2>
        <button
          type="button"
          onClick={() => closeDrawer('sale-items')}
          aria-label="Close items"
          className="grid h-9 w-9 place-items-center"
        >
          <X size={24} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        {items.map((item, index) => {
          const quantity = item.quantity || 1
          const description =
            item.productDescription ||
            item.selectedVariant?.label ||
            item.selectedVariant?.values
              ?.map((value) => value.value)
              .join(' / ')

          return (
            <div
              key={`${item.productId || item.productName || 'item'}-${index}`}
              className="flex min-w-0 items-center gap-3 py-2"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[#F1F1F1]">
                {item.productImageUrl ? (
                  <img
                    src={item.productImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[#9CA3AF]">
                    <ImageIcon size={20} />
                  </div>
                )}
                {quantity > 1 && (
                  <span className="absolute inset-0 grid place-items-center bg-black/45 text-[22px] font-bold text-white">
                    {quantity}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-[#111827]">
                  {item.productName || `Item ${index + 1}`}
                </p>
                <p className="truncate text-sm font-medium text-[#6B7280]">
                  {description || 'Premium item'}
                </p>
                <p className="mt-1 text-[14px] font-medium text-[#374151]">
                  NGN {formatAmount(item.price || 0)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
