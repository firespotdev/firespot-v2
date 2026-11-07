'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronRight, MessageCircleHeart } from 'lucide-react'
import { EmptyState, LoaderCircle } from '@/components/ui'
import { useBusinessFeedback } from '@/services/business-profile'
import {
  useCustomerActions,
  type LeaveFeedbackAction,
} from '@/services/customer-actions'
import { ReviewCard } from './review-card'

interface FeedbackProps {
  businessId: string
  businessName: string
}

export function Feedback({ businessId, businessName }: FeedbackProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const customerActions = useCustomerActions()
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useBusinessFeedback(businessId)
  const feedback = data?.pages.flatMap((page) => page.data) || []
  const feedbackAction = customerActions.data?.data.find(
    (action): action is LeaveFeedbackAction =>
      action.type === 'leave_feedback' && action.merchant.id === businessId,
  )

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchNextPage()
      },
      { rootMargin: '100px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <LoaderCircle />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="px-4 py-16 text-center text-sm font-medium text-[#00000080]">
        Couldn’t load feedback. Try again later.
      </p>
    )
  }

  return (
    <div className="px-4 pt-4">
      {feedbackAction && (
        <Link
          href={`/pay/${encodeURIComponent(feedbackAction.serialNumber)}?saleId=${encodeURIComponent(feedbackAction.saleId)}`}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-[#F1F1F1] bg-white p-3 text-left shadow-[0px_4px_8px_0px_#0000000A] transition-colors active:bg-[#F8F9FA]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#26B2FF] text-white">
            <MessageCircleHeart size={20} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-black">
              We value your feedback.
            </span>
            <span className="mt-0.5 block text-[13px] font-medium leading-[140%] text-[#00000080]">
              Tell us at {businessName} how we can improve our services.
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#B8B8B8]" />
        </Link>
      )}

      {feedback.length === 0 ? (
        <div className="flex min-h-64 items-center justify-center py-12">
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
            title="No feedback yet"
            details="Customer feedback for this business will appear here."
            cta={null}
          />
        </div>
      ) : (
        <>
          {feedback.map((review) => (
            <ReviewCard
              key={review.id}
              customerName={review.customerName}
              customerPhotoUrl={review.customerPhotoUrl}
              rating={review.rating}
              comment={review.comment}
              createdAt={review.createdAt}
            />
          ))}

          <div
            ref={sentinelRef}
            className="flex h-10 items-center justify-center"
          >
            {isFetchingNextPage && <LoaderCircle />}
          </div>

          {!hasNextPage && (
            <p className="py-6 text-center text-[12px] font-medium text-[#00000066]">
              You’ve reached the end of the list
            </p>
          )}
        </>
      )}
    </div>
  )
}
