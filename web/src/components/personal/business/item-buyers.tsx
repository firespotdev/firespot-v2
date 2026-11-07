'use client'

import { MerchantAvatar } from '@/components/layout'
import { useDrawerStore } from '@/services/drawer'
import { useProductBuyers } from '@/services/products/hooks'
import type { ProductBuyers } from '@/services/products/productsApi'

/** "Deji S., Michael F. and 24 others have bought this item." */
export function buyersSentence({ buyerCount, recentBuyers }: ProductBuyers) {
  const names = recentBuyers.map((buyer) => buyer.name)
  const others = buyerCount - names.length
  const people = (count: number) => `${count} ${count === 1 ? 'other' : 'others'}`

  if (names.length === 0) {
    return `${buyerCount} ${buyerCount === 1 ? 'person has' : 'people have'} bought this item.`
  }
  if (others === 0) {
    return names.length === 1
      ? `${names[0]} has bought this item.`
      : `${names.join(' and ')} have bought this item.`
  }
  return `${names.join(', ')} and ${people(others)} have bought this item.`
}

/** Hidden until someone has bought the item; there is nothing to say before. */
export function ItemBuyers({
  businessId,
  productId,
  productName,
}: {
  businessId: string
  productId: string
  productName: string
}) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { data } = useProductBuyers(businessId, productId)

  if (!data || data.buyerCount === 0) return null

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#F7F8FA] px-3 py-2.5">
      {data.recentBuyers.length > 0 && (
        <div className="flex shrink-0 -space-x-2">
          {data.recentBuyers.map((buyer, index) => (
            <span key={`${buyer.name}-${index}`} className="rounded-full ring-2 ring-[#F7F8FA]">
              <MerchantAvatar
                profilePhotoUrl={buyer.photoUrl ?? undefined}
                alt={buyer.name}
                size={28}
              />
            </span>
          ))}
        </div>
      )}
      <p className="text-[13px] font-medium leading-[1.4] text-[#374151]">
        {buyersSentence(data)}{' '}
        {data.reviews.length > 0 && (
          <button
            type="button"
            onClick={() =>
              openDrawer({
                type: 'item-reviews',
                dismissible: true,
                props: { productName, reviews: data.reviews },
              })
            }
            className="font-semibold text-black underline underline-offset-2"
          >
            See their reviews
          </button>
        )}
      </p>
    </div>
  )
}
