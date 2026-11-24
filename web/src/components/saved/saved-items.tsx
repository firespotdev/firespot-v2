'use client'

import {
  ProductCard,
  itemDetailsHref,
} from '@/components/personal/business/product-card'
import { showNotificationToast } from '@/components/ui'
import { useAddToPurchase } from '@/hooks/use-add-to-purchase'
import { cn } from '@/lib/utils'
import type { SavedItem } from '@/services/saved'

/** One saved item; + adds it to an order with the shop that sells it. */
function SavedItemCard({ item }: { item: SavedItem }) {
  const { addToPurchase } = useAddToPurchase(item.merchant.serialNumber)

  const add = () => {
    addToPurchase(item.product)
    if (item.product.options.length === 0 || item.product.variants.length === 0) {
      showNotificationToast({
        message: `${item.product.name} added to your order`,
        mode: 'success',
      })
    }
  }

  return (
    <ProductCard
      product={item.product}
      href={itemDetailsHref(item.merchant.id, item.product._id)}
      onAdd={add}
      imageClassName="rounded-[8px]"
    />
  )
}

/** Saved items as a scrolling row (ALL) or a two-column grid (ITEMS). */
export function SavedItems({
  items,
  layout,
}: {
  items: SavedItem[]
  layout: 'row' | 'grid'
}) {
  return (
    <div
      className={cn(
        layout === 'row'
          ? 'scrollbar-hide -mx-3 flex gap-3 overflow-x-auto px-3 [&>div]:w-[160px] [&>div]:shrink-0'
          : 'grid grid-cols-2 gap-x-3 gap-y-5',
      )}
    >
      {items.map((item) => (
        <SavedItemCard key={item.product._id} item={item} />
      ))}
    </div>
  )
}
