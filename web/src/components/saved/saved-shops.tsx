'use client'

import Link from 'next/link'
import { MerchantAvatar } from '@/components/layout'
import { VerifiedBadge } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { FavoriteMerchant } from '@/services/favorites/interface'

function SavedShop({ shop }: { shop: FavoriteMerchant }) {
  return (
    <Link
      href={`/business?businessId=${shop.id}`}
      className="flex min-w-0 flex-col items-center"
    >
      <span className="rounded-full border-[3px] border-[#D9DEE6] p-0.5">
        <MerchantAvatar
          profilePhotoUrl={shop.businessImageUrl || shop.profilePhotoUrl}
          alt={shop.businessName || 'Saved shop'}
          size={64}
        />
      </span>
      <span className="mt-2 flex max-w-full items-center gap-0.5">
        <span className="truncate text-[13px] font-medium text-black">
          {shop.businessName || 'Business'}
        </span>
        <VerifiedBadge
          level={shop.verificationLevel}
          className="[&_svg]:h-3.5 [&_svg]:w-3.5"
        />
      </span>
    </Link>
  )
}

/** Saved shops as a scrolling row (ALL) or a four-column grid (SHOPS). */
export function SavedShops({
  shops,
  layout,
}: {
  shops: FavoriteMerchant[]
  layout: 'row' | 'grid'
}) {
  return (
    <div
      className={cn(
        layout === 'row'
          ? 'scrollbar-hide -mx-3 flex gap-4 overflow-x-auto px-3 [&>a]:w-[84px] [&>a]:shrink-0'
          : 'grid grid-cols-4 gap-x-3 gap-y-5',
      )}
    >
      {shops.map((shop) => (
        <SavedShop key={shop.id} shop={shop} />
      ))}
    </div>
  )
}
