'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Package, Plus } from 'lucide-react'
import type { Product } from '@/services/products/productsApi'
import {
  formatProductPrice,
  getProductPricing,
} from '@/lib/utils/product-pricing'

export function itemDetailsHref(businessId: string, productId: string) {
  const params = new URLSearchParams({ businessId, productId })
  return `/business/item?${params.toString()}`
}

export function ProductPrice({ product }: { product: Product }) {
  const { price, isFromPrice, compareAtPrice } = getProductPricing(product)

  return (
    <div className="mt-0.5 flex items-baseline gap-1.5">
      <span className="text-[14px] font-bold text-[#00BA55]">
        {isFromPrice && 'from '}₦ {formatProductPrice(price)}
      </span>
      {compareAtPrice !== null && (
        <span className="text-[12px] font-medium text-[#9CA3AF] line-through">
          ₦ {formatProductPrice(compareAtPrice)}
        </span>
      )}
    </div>
  )
}

export function ProductCard({
  product,
  href,
  onAdd,
}: {
  product: Product
  href: string
  /** Absent when the merchant can't take orders, which hides the add button. */
  onAdd?: () => void
}) {
  return (
    <div className="group flex flex-col">
      <div className="relative aspect-square w-full overflow-hidden rounded-[14px] bg-[#F4F6F8]">
        {/* Duplicate of the text link below, so it's skipped by keyboard and
            screen readers. The add button is its sibling, not its child. */}
        <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, 240px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#9CA3AF]">
              <Package size={32} strokeWidth={1.5} />
            </div>
          )}
        </Link>

        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add ${product.name}`}
            className="absolute bottom-2.5 right-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-transform active:scale-90 hover:bg-gray-50"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <Link href={href} className="flex flex-col">
        <h3 className="mt-2 line-clamp-1 text-[14px] font-bold leading-snug text-black">
          {product.name}
        </h3>

        <ProductPrice product={product} />

        {product.description && (
          <p className="mt-1 line-clamp-2 text-xs font-normal leading-[1.35] text-[#6B7280]">
            {product.description}
          </p>
        )}
      </Link>
    </div>
  )
}
