'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CartCheckoutBarProps {
  itemCount: number
  onCheckout: () => void
  /** Opens the selection; defaults to checking out. */
  onViewSelection?: () => void
  className?: string
}

/** "N items selected · Checkout" footer shared by the catalogue and profile. */
export function CartCheckoutBar({
  itemCount,
  onCheckout,
  onViewSelection = onCheckout,
  className,
}: CartCheckoutBarProps) {
  const isEmpty = itemCount === 0

  return (
    <footer
      className={cn(
        'flex shrink-0 items-center gap-3 border-t border-[#F1F1F1] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      <button
        type="button"
        onClick={onViewSelection}
        disabled={isEmpty}
        className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
      >
        <span className="block text-[14px] font-bold text-[#111827]">
          {itemCount} {itemCount === 1 ? 'item' : 'items'} selected
        </span>
        <span className="mt-0.5 block text-xs font-medium text-[#9CA3AF]">
          View selection ›
        </span>
      </button>
      <Button
        type="button"
        onClick={onCheckout}
        disabled={isEmpty}
        className="h-11 w-auto px-6"
      >
        Checkout
      </Button>
    </footer>
  )
}
