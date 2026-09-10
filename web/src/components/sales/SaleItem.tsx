'use client'

import { ChevronRight } from 'lucide-react'
import { SwipeableItem } from '@/components/recents/SwipeableItem'
import { MerchantAvatar } from '@/components/layout/MerchantAvatar'
import { Sale } from '@/services/sales/interface'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils/date-time'
import {
  getAmountLabel,
  getRecentSaleSummary,
  getSaleCustomerPhotoUrl,
  getSaleCustomerName,
  getStatusDescription,
  getMerchantStatus,
} from '@/lib/utils/sales'
import { StatusBadge } from '@/components/ui'

interface SaleItemProps {
  sale: Sale
  isSwipeable?: boolean
  onConfirm?: () => void
  onArchive?: () => void
  onClick?: (sale: Sale) => void
  isConfirming?: boolean
  isArchiving?: boolean
  actionsDisabled?: boolean
  className?: string
  variant?:
    | 'default'
    | 'minimal'
    | 'history'
    | 'recent-unconfirmed'
    | 'recent-confirmed'
}

export function SaleItem({
  sale,
  isSwipeable = false,
  onConfirm,
  onArchive,
  onClick,
  isConfirming = false,
  isArchiving = false,
  actionsDisabled = false,
  className,
  variant = 'default',
}: SaleItemProps) {
  const isArchivedItem = getMerchantStatus(sale) === 'Archived'
  const isRecent = variant.startsWith('recent-')
  const title =
    variant === 'recent-confirmed' || variant === 'history'
      ? getSaleCustomerName(sale)
      : variant === 'recent-unconfirmed'
        ? getRecentSaleSummary(sale)
        : getStatusDescription(sale)
  const accessibleTitle =
    variant === 'recent-unconfirmed' ? getStatusDescription(sale) : title

  const content = (
    <div
      className={cn(
        'p-3 flex items-center justify-between gap-3 border-b border-[#F1F1F1] bg-white cursor-pointer transition-colors hover:bg-gray-50',
        isArchivedItem && variant === 'default' && 'bg-[#FAFAFA] opacity-70',
        className,
      )}
      onClick={() => onClick?.(sale)}
    >
      <div className="flex flex-1 items-center gap-2 min-w-0 overflow-hidden">
        <MerchantAvatar
          bankName={sale.targetBankName}
          profilePhotoUrl={getSaleCustomerPhotoUrl(sale)}
          alt={getSaleCustomerName(sale)}
          size={36}
        />
        <div className="flex-1 min-w-0">
          <h4
            aria-label={accessibleTitle}
            title={accessibleTitle}
            className={cn(
              'font-bold text-[#111827] truncate',
              variant !== 'recent-unconfirmed' && 'capitalize',
              isRecent ? 'text-[13px]' : 'text-[13px]',
            )}
          >
            {title}
          </h4>
          <p
            className={cn(
              'text-[#6B7280] font-medium tracking-tight',
              isRecent ? 'text-[12px]' : 'text-[11px] uppercase',
            )}
          >
            {formatDateTime(sale.recordedAt || sale.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-col items-end">
          <p className="text-[14px] font-bold text-[#111827] mb-0.5">
            {getAmountLabel(sale)}
          </p>
          <StatusBadge status={getMerchantStatus(sale)} variant="text" />
        </div>
        <ChevronRight className="text-[#D1D5DB]" size={16} />
      </div>
    </div>
  )

  if (isSwipeable && onConfirm && onArchive) {
    return (
      <SwipeableItem
        onConfirm={onConfirm}
        onArchive={onArchive}
        disabled={actionsDisabled || isConfirming || isArchiving}
        className={className}
      >
        {content}
      </SwipeableItem>
    )
  }

  return content
}
