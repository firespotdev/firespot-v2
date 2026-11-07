'use client'

import { format } from 'date-fns'
import { Star } from 'lucide-react'
import { MerchantAvatar } from '@/components/layout'

export interface ReviewCardProps {
  customerName: string
  customerPhotoUrl?: string | null
  rating: number
  comment: string
  createdAt?: string
}

export function ReviewCard({
  customerName,
  customerPhotoUrl,
  rating,
  comment,
  createdAt,
}: ReviewCardProps) {
  return (
    <article className="mb-3 rounded-xl border border-[#f1f1f1] bg-white p-3 shadow-[0px_0.25rem_0.5rem_0px_#0000000A]">
      <div className="mb-3 flex items-center gap-2">
        <MerchantAvatar
          profilePhotoUrl={customerPhotoUrl ?? undefined}
          alt={customerName}
          size={36}
        />
        <div>
          <h3 className="text-sm font-bold">{customerName}</h3>
          <div className="flex items-center gap-1 text-xs font-medium text-[#6B7280]">
            <span
              className="flex items-center"
              aria-label={`${rating} out of 5 stars`}
            >
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  size={14}
                  strokeWidth={1.5}
                  color={index < rating ? '#F5A623' : '#D1D5DB'}
                  fill={index < rating ? '#F5A623' : '#D1D5DB'}
                />
              ))}
            </span>
            {createdAt && (
              <span>{format(new Date(createdAt), 'h:mm a · MMM d')}</span>
            )}
          </div>
        </div>
      </div>
      <p className="text-base font-medium text-[#374151]">{comment}</p>
    </article>
  )
}
