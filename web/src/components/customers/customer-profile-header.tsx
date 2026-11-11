'use client'

import { format } from 'date-fns'
import { Messages2 } from 'iconsax-reactjs'
import { Bookmark, Phone } from 'lucide-react'
import { MerchantAvatar } from '@/components/layout'
import { LoaderCircle } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Customer } from '@/services/customers/customersApi'
import { purchasesLabel } from './customer-stats'

const ROUND_BUTTON =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-black shadow-xs transition-colors hover:bg-gray-50 active:scale-95 disabled:opacity-60'

interface Props {
  customer: Customer
  purchases: number
  isSaving: boolean
  onQuickSale: () => void
  onToggleSaved: () => void
  onCall: () => void
  onMessage: () => void
}

/** Centred photo, name and the customer's quick actions. */
export function CustomerProfileHeader({
  customer,
  purchases,
  isSaving,
  onQuickSale,
  onToggleSaved,
  onCall,
  onMessage,
}: Props) {
  const isSaved = Boolean(customer.isFavorite)

  return (
    <div className="flex flex-col items-center text-center">
      <MerchantAvatar
        profilePhotoUrl={customer.profilePhotoUrl}
        alt={customer.name}
        size={96}
        className="rounded-full shadow-[0px_8px_24px_0px_#0000001F]"
      />
      <h1 className="mt-4 text-[28px] leading-tight font-bold -tracking-[0.6px] text-black capitalize">
        {customer.name}
      </h1>
      <p className="mt-1 text-sm font-medium text-[#00000080]">
        Customer since {format(new Date(customer.createdAt), 'MMM d, yyyy')}
        <span className="mx-1.5" aria-hidden>
          •
        </span>
        {purchasesLabel(purchases)}
      </p>

      <div className="mt-6 flex items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={onQuickSale}
          className="flex h-11 items-center justify-center rounded-full bg-black px-5 text-[15px] font-bold text-white shadow-xs transition-transform active:scale-95"
        >
          Quick sale
        </button>
        <button
          type="button"
          onClick={onToggleSaved}
          disabled={isSaving}
          aria-pressed={isSaved}
          aria-label={isSaved ? 'Unsave customer' : 'Save customer'}
          className={ROUND_BUTTON}
        >
          {isSaving ? (
            <span className="h-5 w-5">
              <LoaderCircle size={5} />
            </span>
          ) : (
            <Bookmark
              size={18}
              strokeWidth={2}
              className={cn('text-black', isSaved && 'fill-black')}
            />
          )}
        </button>
        <button
          type="button"
          onClick={onCall}
          aria-label={`Call ${customer.name}`}
          className={ROUND_BUTTON}
        >
          <Phone size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onMessage}
          aria-label={`Message ${customer.name}`}
          className={ROUND_BUTTON}
        >
          <Messages2 size={20} color="#000000" />
        </button>
      </div>
    </div>
  )
}
