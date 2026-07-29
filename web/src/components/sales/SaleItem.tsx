'use client'

import { ChevronRight, Check, Loader2, X } from 'lucide-react'
import { SwipeableItem } from '@/components/recents/SwipeableItem'
import { MerchantAvatar } from '@/components/layout/MerchantAvatar'
import { Sale } from '@/services/sales/interface'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/constants'
import {
  getAmountLabel,
  getRecentSaleSummary,
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
  variant?: 'default' | 'minimal' | 'recent-unconfirmed' | 'recent-confirmed'
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
    variant === 'recent-unconfirmed' || variant === 'recent-confirmed'
      ? getRecentSaleSummary(sale)
      : getStatusDescription(sale)

  const content = (
    <div
      className={cn(
        'p-3 flex items-center justify-between border-b border-[#F1F1F1] bg-white cursor-pointer transition-colors hover:bg-gray-50',
        isArchivedItem && variant === 'default' && 'bg-[#FAFAFA] opacity-70',
        className,
      )}
      onClick={() => onClick?.(sale)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <MerchantAvatar bankName={sale.targetBankName} size={36} />
        <div className="min-w-0">
          <h4
            className={cn(
              'font-bold text-[#111827] mb-0.5 capitalize truncate',
              isRecent ? 'text-[14px]' : 'text-[13px]',
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
            {formatDate(sale.createdAt)}
          </p>
        </div>
      </div>

      {isSwipeable ? (
        <div className="flex items-center gap-2 shrink-0">
          {/* Archive Button */}
          <button
            type="button"
            aria-label="Archive sale"
            disabled={actionsDisabled || isConfirming || isArchiving}
            onClick={(e) => {
              e.stopPropagation()
              onArchive?.()
            }}
            className="w-10 h-10 rounded-full bg-[#0000000A] hover:bg-[#0000000A]/80 border-[1.11px] border-[#0000000A] flex items-center justify-center text-black shadow-[0px_2.22px_4.44px_0px_#0000000A] transition-all shrink-0"
          >
            {isArchiving ? (
              <Loader2 className="h-4 w-4 animate-spin text-black" />
            ) : (
              <X className="w-4 h-4 text-black" strokeWidth={2.5} />
            )}
          </button>

          {/* Confirm Button */}
          <button
            type="button"
            aria-label="Confirm sale"
            disabled={actionsDisabled || isConfirming || isArchiving}
            onClick={(e) => {
              e.stopPropagation()
              onConfirm?.()
            }}
            className="w-10 h-10 rounded-full bg-[#24C166] hover:bg-[#24C166]/80 flex items-center justify-center text-white shadow-[0px_2.22px_4.44px_0px_#1433204D] transition-all shrink-0"
          >
            {isConfirming ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end">
            <p className="text-[14px] font-bold text-[#111827] mb-0.5">
              {getAmountLabel(sale)}
            </p>
            <StatusBadge status={getMerchantStatus(sale)} variant="text" />
          </div>
          <ChevronRight className="text-[#9CA3AF]" size={18} />
        </div>
      )}
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
