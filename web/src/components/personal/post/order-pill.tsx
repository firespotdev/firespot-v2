'use client'

import { ChevronRight, ShoppingBag } from 'lucide-react'

/** "N items | View" pill shown while the order with this shop has items. */
export function OrderPill({
  itemCount,
  onView,
}: {
  itemCount: number
  onView: () => void
}) {
  if (itemCount === 0) return null

  return (
    <button
      type="button"
      onClick={onView}
      className="flex h-11 items-center gap-2.5 rounded-full bg-black py-1.5 pr-4 pl-1.5 text-white shadow-[0px_4px_12px_0px_#00000033]"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#38B6FF]">
        <ShoppingBag size={16} strokeWidth={2.2} />
      </span>
      <span className="text-[15px] font-medium">
        {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </span>
      <span className="h-5 w-px bg-white/40" aria-hidden />
      <span className="flex items-center gap-0.5 text-[15px] font-medium">
        View <ChevronRight size={16} />
      </span>
    </button>
  )
}
