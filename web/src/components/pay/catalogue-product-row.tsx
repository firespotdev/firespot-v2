'use client'

import { Image as ImageIcon, Plus } from 'lucide-react'
import type { Product } from '@/services/products/productsApi'

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

interface CatalogueProductRowProps {
  product: Product
  /** How many are in the cart; shown over the image. */
  quantity: number
  /** Absent when the merchant can't take orders, which hides the button. */
  onAdd?: () => void
  /** Tapping the row (not the add button) opens the item. */
  onOpen?: () => void
}

export function CatalogueProductRow({
  product,
  quantity,
  onAdd,
  onOpen,
}: CatalogueProductRowProps) {
  const details = (
    <>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[#F1F1F1]">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[#9CA3AF]">
            <ImageIcon size={20} />
          </div>
        )}
        {quantity > 0 && (
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-[22px] font-bold text-white">
            {quantity}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[14px] font-bold text-[#111827]">
          {product.name}
        </p>
        <p className="truncate text-sm font-medium text-[#6B7280]">
          {product.description || 'Product'}
        </p>
        <p className="mt-1 text-[14px] font-medium text-[#374151]">
          NGN {money(product.price)}
        </p>
      </div>
    </>
  )

  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-[#F1F1F1] py-2 last:border-0">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {details}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{details}</div>
      )}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${product.name}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#F1F1F1]"
        >
          <Plus size={18} />
        </button>
      )}
    </div>
  )
}
