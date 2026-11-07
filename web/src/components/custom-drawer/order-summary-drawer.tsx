'use client'

import Image from 'next/image'
import { useRouter } from '@bprogress/next/app'
import { ChevronDown, Image as ImageIcon, Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { usePurchaseCartStore } from '@/services/pay/purchaseCartSlice'
import { useDeleteCustomerCartDraft } from '@/services/customer-actions'
import type { CartItem } from '@/components/sales/types'

interface OrderSummaryDrawerProps {
  merchantId: string
  serialNumber: string
}

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const variantLabel = (item: CartItem) =>
  item.selectedVariant?.label ||
  item.selectedVariant?.values?.map((value) => value.value).join(' / ')

function OrderItemRow({
  item,
  onChangeQuantity,
}: {
  item: CartItem
  onChangeQuantity: (delta: number) => void
}) {
  const label = variantLabel(item)

  return (
    <article className="border-b border-[#ECEEF1] py-4 last:border-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[15px] font-medium text-[#111827]">
            {item.name}
          </p>
          {label && (
            <p className="mt-0.5 truncate text-sm font-medium text-[#6B7280]">
              {label}
            </p>
          )}
        </div>
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[8px] bg-[#F1F1F1]">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-[#9CA3AF]">
              <ImageIcon size={18} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChangeQuantity(-item.quantity)}
          aria-label={`Remove ${item.name}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#EEF0F2]"
        >
          <Trash2 size={16} />
        </button>
        <div className="flex h-9 items-center rounded-[10px] bg-[#EEF0F2]">
          <button
            type="button"
            onClick={() => onChangeQuantity(-1)}
            aria-label={`Decrease ${item.name} quantity`}
            className="grid h-9 w-9 place-items-center"
          >
            <Minus size={16} />
          </button>
          <span className="min-w-8 text-center text-[14px] font-bold">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onChangeQuantity(1)}
            aria-label={`Increase ${item.name} quantity`}
            className="grid h-9 w-9 place-items-center"
          >
            <Plus size={16} />
          </button>
        </div>
        <p className="ml-auto shrink-0 text-[15px] font-bold text-[#111827]">
          NGN {money(item.price * item.quantity)}
        </p>
      </div>
    </article>
  )
}

/** "Your order" sheet opened from a business profile's checkout bar. */
export function OrderSummaryDrawer({
  merchantId,
  serialNumber,
}: OrderSummaryDrawerProps) {
  const router = useRouter()
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const closeAllDrawers = useDrawerStore((state) => state.closeAllDrawers)
  const items = usePurchaseCartStore((state) => state.items)
  const updateQuantity = usePurchaseCartStore((state) => state.updateQuantity)
  const clear = usePurchaseCartStore((state) => state.clear)
  // The pay page restores a saved server draft into an empty cart, so clearing
  // here must remove that copy too.
  const deleteCartDraft = useDeleteCustomerCartDraft()
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const close = () => closeDrawer('order-summary')

  const clearOrder = () => {
    clear()
    deleteCartDraft.mutate(merchantId)
    close()
  }

  const changeQuantity = (id: string, delta: number) => {
    const remaining = items.filter(
      (item) => item.id !== id || item.quantity + delta > 0,
    )
    updateQuantity(id, delta)
    if (remaining.length === 0) {
      deleteCartDraft.mutate(merchantId)
      close()
    }
  }

  const placeOrder = () => {
    // Also closes the item search sheet when the order was opened from it.
    closeAllDrawers()
    router.push(`/pay/${encodeURIComponent(serialNumber)}?checkout=cart`)
  }

  return (
    <div className="flex max-h-[85dvh] min-h-0 w-full flex-col bg-white font-satoshi">
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={close}
          aria-label="Close order"
          className="grid h-9 w-9 place-items-center"
        >
          <ChevronDown size={24} />
        </button>
        <h2 className="text-[17px] font-bold">Your order ({items.length})</h2>
        <button
          type="button"
          onClick={clearOrder}
          className="h-9 text-[14px] font-medium text-black underline underline-offset-4"
        >
          Clear
        </button>
      </header>

      <main className="min-h-0 overflow-y-auto bg-[#F9FAFB] px-4">
        {items.map((item) => (
          <OrderItemRow
            key={item.id}
            item={item}
            onChangeQuantity={(delta) => changeQuantity(item.id, delta)}
          />
        ))}
      </main>

      <section className="shrink-0 border-t border-[#F1F1F1] px-4 py-4">
        <div className="flex items-center justify-between text-[15px] font-medium">
          <span className="text-[#6B7280]">Subtotal</span>
          <span className="text-[#111827]">NGN {money(total)}</span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[#F1F1F1] pt-4 text-[16px] font-bold">
          <span>Total</span>
          <span>NGN {money(total)}</span>
        </div>
      </section>

      <footer className="shrink-0 border-t border-[#F1F1F1] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          onClick={placeOrder}
          disabled={items.length === 0}
        >
          Place order
        </Button>
      </footer>
    </div>
  )
}
