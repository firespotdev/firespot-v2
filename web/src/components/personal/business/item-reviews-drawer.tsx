'use client'

import { X } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import type { ProductBuyers } from '@/services/products/productsApi'
import { ReviewCard } from './review-card'

interface ItemReviewsDrawerProps {
  productName: string
  reviews: ProductBuyers['reviews']
  closeDrawer: () => void
}

/** Reviews left by the customers who bought one item. */
export function ItemReviewsDrawer({
  productName,
  reviews,
  closeDrawer,
}: ItemReviewsDrawerProps) {
  return (
    <div className="bg-[#F4F6F8] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between pb-4">
        <div className="h-8 w-8" />
        <h1 className="truncate px-2 text-[1rem] font-bold">
          Reviews of {productName}
        </h1>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close reviews"
          className="grid h-8 w-8 shrink-0 place-items-center"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="py-10">
          <EmptyState
            emoji={
              <span
                className="text-[64px] leading-none"
                role="img"
                aria-label="Speech bubble"
              >
                💬
              </span>
            }
            title="No reviews yet"
            details="Buyers of this item haven’t left a review yet."
            cta={null}
          />
        </div>
      ) : (
        <div className="max-h-[65dvh] overflow-y-auto">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              customerName={review.name}
              customerPhotoUrl={review.photoUrl}
              rating={review.rating}
              comment={review.comment}
              createdAt={review.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  )
}
