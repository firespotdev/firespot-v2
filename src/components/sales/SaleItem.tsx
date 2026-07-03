'use client'

import { ChevronRight, Check, X } from 'lucide-react'
import { SwipeableItem } from '@/components/recents/SwipeableItem'
import { MerchantAvatar } from '@/components/layout/MerchantAvatar'
import { Sale } from '@/services/sales/interface'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/constants'
import { getAmountLabel, getStatusDescription, getMerchantStatus } from '@/lib/utils/sales'
import { StatusBadge } from '@/components/ui'

interface SaleItemProps {
  sale: Sale
  isSwipeable?: boolean
  onConfirm?: () => void
  onCancel?: () => void
  onClick?: (sale: Sale) => void
  className?: string
  variant?: 'default' | 'minimal'
}

export function SaleItem({
  sale,
  isSwipeable = false,
  onConfirm,
  onCancel,
  onClick,
  className,
  variant = 'default',
}: SaleItemProps) {
  const content = (
    <div
      className={cn(
        'p-3 flex items-center justify-between border-b border-[#F1F1F1] bg-white cursor-pointer transition-colors hover:bg-gray-50',
        sale.status === 'CANCELLED' &&
          variant === 'default' &&
          'grayscale opacity-70',
        className,
      )}
      onClick={() => onClick?.(sale)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <MerchantAvatar bankName={sale.targetBankName} size={36} />
        <div className="min-w-0">
          <h4 className="text-[13px] font-bold text-[#111827] mb-0.5 capitalize truncate">
            {getStatusDescription(sale)}
          </h4>
          <p className="text-[#6B7280] text-[11px] font-medium uppercase tracking-tight">
            {formatDate(sale.createdAt)}
          </p>
        </div>
      </div>

      {isSwipeable ? (
        <div className="flex items-center gap-2 shrink-0">
          {/* Cancel Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCancel?.()
            }}
            className="w-10 h-10 rounded-full bg-[#0000000A] hover:bg-[#0000000A]/80 border-[1.11px] border-[#0000000A] flex items-center justify-center text-black shadow-[0px_2.22px_4.44px_0px_#0000000A] transition-all shrink-0"
          >
            <X className="w-4 h-4 text-black" strokeWidth={2.5} />
          </button>

          {/* Confirm Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onConfirm?.()
            }}
            className="w-10 h-10 rounded-full bg-[#24C166] hover:bg-[#24C166]/80 flex items-center justify-center text-white shadow-[0px_2.22px_4.44px_0px_#1433204D] transition-all shrink-0"
          >
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
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

  if (isSwipeable && onConfirm && onCancel) {
    return (
      <SwipeableItem
        onConfirm={onConfirm}
        onCancel={onCancel}
        className={className}
      >
        {content}
      </SwipeableItem>
    )
  }

  return content
}
