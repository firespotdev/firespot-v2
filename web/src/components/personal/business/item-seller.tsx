'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { MerchantAvatar } from '@/components/layout'
import { VerifiedBadge } from '@/components/ui'
import type { PublicBusinessProfile } from '@/services/business-profile'
import type { Product } from '@/services/products/productsApi'
import { ProductCard, itemDetailsHref } from './product-card'

const businessHref = (businessId: string) =>
  `/business?businessId=${encodeURIComponent(businessId)}`

export function AboutSeller({ business }: { business: PublicBusinessProfile }) {
  const location = [business.mainAddress?.city, business.mainAddress?.state]
    .filter(Boolean)
    .join(', ')
  const orders = business.stats.orderCount
  const details = [
    location,
    orders > 0 && `${orders} ${orders === 1 ? 'order' : 'orders'}`,
  ]
    .filter(Boolean)
    .join(' • ')

  return (
    <section>
      <h2 className="mb-3 text-[16px] font-bold text-black">About seller</h2>
      <Link
        href={businessHref(business.id)}
        className="flex items-center gap-3 rounded-xl border border-[#F1F1F1] bg-white p-3 shadow-[0px_4px_8px_0px_#0000000A] transition-colors active:bg-[#F8F9FA]"
      >
        <MerchantAvatar
          profilePhotoUrl={business.businessImageUrl}
          alt={business.businessName}
          size={48}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-[15px] font-bold text-black">
              {business.businessName}
            </span>
            <VerifiedBadge
              level={business.verificationLevel}
              className="[&_svg]:h-4 [&_svg]:w-4"
            />
          </span>
          {details && (
            <span className="mt-0.5 block truncate text-[13px] font-medium text-[#6B7280]">
              {details}
            </span>
          )}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#B8B8B8]" />
      </Link>
    </section>
  )
}

export function MoreFromSeller({
  businessId,
  products,
  onAdd,
}: {
  businessId: string
  products: Product[]
  onAdd?: (product: Product) => void
}) {
  if (products.length === 0) return null

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-black">
          More from this seller
        </h2>
        <Link
          href={businessHref(businessId)}
          className="text-[13px] font-semibold text-black underline underline-offset-2"
        >
          View all
        </Link>
      </div>
      <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4">
        {products.map((product) => (
          <div key={product._id} className="w-40 shrink-0">
            <ProductCard
              product={product}
              href={itemDetailsHref(businessId, product._id)}
              onAdd={onAdd && (() => onAdd(product))}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
