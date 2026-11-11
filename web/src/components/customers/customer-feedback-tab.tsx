'use client'

import { ReviewCard } from '@/components/personal/business/review-card'
import { EmptyState } from '@/components/ui'
import type {
  Customer,
  CustomerFeedback,
} from '@/services/customers/customersApi'
import { groupByMonth } from './customer-stats'

interface Props {
  customer: Customer
  feedback: CustomerFeedback[]
}

/** The customer's reviews of the business, newest month first. */
export function CustomerFeedbackTab({ customer, feedback }: Props) {
  const months = groupByMonth(feedback, (entry) => entry.createdAt)

  if (months.length === 0) {
    return (
      <div className="py-10">
        <EmptyState
          emoji={
            <span className="mb-1 text-[64px] leading-none" role="img" aria-label="Speech bubble">
              💬
            </span>
          }
          title="No feedback yet"
          details="Reviews from this customer will show here."
          cta={null}
        />
      </div>
    )
  }

  return (
    <div className="mt-4">
      {months.map(([month, entries]) => (
        <section key={month} className="mb-3">
          <h3 className="mb-2 text-[15px] font-bold text-black">{month}</h3>
          {entries.map((entry) => (
            <ReviewCard
              key={entry._id}
              customerName={customer.name}
              customerPhotoUrl={entry.customerPhotoUrl || customer.profilePhotoUrl}
              rating={entry.rating ?? 0}
              comment={entry.comment ?? ''}
              createdAt={entry.createdAt}
            />
          ))}
        </section>
      ))}
      <p className="pt-3 pb-2 text-center text-xs font-medium text-[#00000066]">
        You’ve reached the end of the list
      </p>
    </div>
  )
}
