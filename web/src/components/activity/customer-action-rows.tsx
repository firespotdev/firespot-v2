import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { MerchantAvatar } from '@/components/layout'
import { formatCurrency } from '@/lib/utils'
import type { CustomerAction } from '@/services/customer-actions'

const titleFor = (action: CustomerAction) => {
  if (action.type === 'resume_checkout') return 'Finish your order'
  if (action.type === 'complete_payment') return 'Complete payment'
  return 'Rate your experience'
}

const subtitleFor = (action: CustomerAction) => {
  if (action.type === 'leave_feedback') {
    return `Leave feedback for ${action.merchant.businessName}`
  }
  const count = action.itemCount || 0
  const details = [
    count > 0 ? `${count} item${count === 1 ? '' : 's'}` : null,
    action.amount ? `NGN ${formatCurrency(action.amount)}` : null,
  ].filter(Boolean)
  return details.length
    ? `${action.merchant.businessName} · ${details.join(' · ')}`
    : action.merchant.businessName
}

const hrefFor = (action: CustomerAction) => {
  const base = `/pay/${encodeURIComponent(action.serialNumber)}`
  return action.type === 'resume_checkout'
    ? base
    : `${base}?saleId=${encodeURIComponent(action.saleId)}`
}

export function CustomerActionRows({
  actions,
  onNavigate,
}: {
  actions: CustomerAction[]
  onNavigate?: () => void
}) {
  return (
    <div className="divide-y divide-[#F1F1F1]">
      {actions.map((action) => (
        <Link
          key={action.id}
          href={hrefFor(action)}
          onClick={onNavigate}
          className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <MerchantAvatar
            profilePhotoUrl={action.merchant.businessImageUrl}
            alt={action.merchant.businessName}
            size={48}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-bold text-black">
              {titleFor(action)}
            </span>
            <span className="mt-0.5 block truncate text-[13px] font-medium text-[#00000099]">
              {subtitleFor(action)}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#868788]" />
        </Link>
      ))}
    </div>
  )
}
