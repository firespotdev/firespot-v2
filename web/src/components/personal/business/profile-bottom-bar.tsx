'use client'

import type { ReactNode } from 'react'
import { useRouter } from '@bprogress/next/app'
import { CartCheckoutBar } from '@/components/pay/cart-checkout-bar'
import { useAddToPurchase } from '@/hooks/use-add-to-purchase'
import { useDrawerStore } from '@/services/drawer'
import { cn } from '@/lib/utils'

interface ProfileBottomBarProps {
  businessId: string
  serialNumber?: string
  /** Without a title the bar only appears for the cart. */
  title?: ReactNode
  subtitle?: ReactNode
  /** The black action on the right, if this tab has one. */
  action?: ReactNode
}

const BAR_POSITION = 'fixed inset-x-0 bottom-0 z-30 mx-auto max-w-125'

/**
 * A profile tab's sticky footer. Items in this business's cart always take
 * it over with Checkout, so an order in progress is never hidden.
 */
export function ProfileBottomBar({
  businessId,
  serialNumber,
  title,
  subtitle,
  action,
}: ProfileBottomBarProps) {
  const router = useRouter()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { cartItems } = useAddToPurchase(serialNumber)

  if (serialNumber && cartItems.length > 0) {
    return (
      <CartCheckoutBar
        itemCount={cartItems.length}
        onCheckout={() => router.push(`/pay/${serialNumber}?checkout=cart`)}
        onViewSelection={() =>
          openDrawer({
            type: 'order-summary',
            direction: 'bottom',
            props: { merchantId: businessId, serialNumber },
          })
        }
        className={BAR_POSITION}
      />
    )
  }

  if (!title) return null

  return (
    <footer
      className={cn(
        BAR_POSITION,
        'flex items-center gap-3 border-t border-[#F1F1F1] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold text-[#111827]">
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-[13px] font-medium text-[#9CA3AF]">
            {subtitle}
          </div>
        )}
      </div>
      {action}
    </footer>
  )
}
