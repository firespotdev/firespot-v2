'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Bookmark, Package } from 'lucide-react'
import { itemDetailsHref } from '@/components/personal/business/product-card'
import { useSavedItemToggle } from '@/components/saved/use-saved-toggles'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/services/products/productsApi'

function PostItemCard({
  product,
  merchantId,
}: {
  product: Product
  merchantId: string
}) {
  const saved = useSavedItemToggle()
  const isSaved = saved.isSaved(product._id)

  return (
    <div className="relative flex w-[300px] shrink-0 items-center gap-3 rounded-[16px] border border-[#F1F1F1] bg-white p-3 shadow-[0px_2px_8px_0px_#0000000A]">
      <Link
        href={itemDetailsHref(merchantId, product._id)}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[#F4F6F8] text-[#9CA3AF]">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Package size={22} strokeWidth={1.5} />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-black">
            {product.name}
          </span>
          {product.description && (
            <span className="block truncate text-[13px] font-medium text-[#6B7280]">
              {product.description}
            </span>
          )}
          <span className="block text-[14px] font-medium text-black">
            NGN {formatCurrency(product.price)}
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => saved.toggle(product._id, product.name)}
        aria-pressed={isSaved}
        aria-label={isSaved ? `Unsave ${product.name}` : `Save ${product.name}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F1F1] text-black"
      >
        <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

/** The items tagged in the post, and Buy now for all of them. */
export function PostItems({
  products,
  merchantId,
  canOrder,
  onBuyNow,
}: {
  products: Product[]
  merchantId: string
  canOrder: boolean
  onBuyNow: () => void
}) {
  if (products.length === 0) return null

  return (
    <section className="border-b border-[#F1F1F1] py-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-black">Items in this post</h2>
        <Link
          href={`/business?businessId=${merchantId}`}
          className="text-[12px] font-medium text-black underline underline-offset-4"
        >
          View all
        </Link>
      </div>
      <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {products.map((product) => (
          <PostItemCard key={product._id} product={product} merchantId={merchantId} />
        ))}
      </div>
      {canOrder && (
        <button
          type="button"
          onClick={onBuyNow}
          className="mt-4 h-12 w-full rounded-full bg-[#F1F1F1] text-[16px] font-bold text-black active:bg-[#E5E7EB]"
        >
          Buy now
        </button>
      )}
    </section>
  )
}
