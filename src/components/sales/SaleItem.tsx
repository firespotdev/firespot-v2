'use client'

import { ChevronRight } from 'lucide-react'
import { SwipeableItem } from '@/components/recents/SwipeableItem'
import { MerchantAvatar } from '@/components/layout/MerchantAvatar'
import { Sale } from '@/services/sales/interface'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/constants'
import { 
  getStatusColor, 
  getStatusLabel, 
  getAmountLabel, 
  getStatusDescription 
} from '@/lib/utils/sales'

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
  variant = 'default'
}: SaleItemProps) {
  
  const content = (
    <div 
      className={cn(
        "p-3 flex items-center justify-between border-b border-[#F1F1F1] last:border-b-0 bg-white cursor-pointer transition-colors hover:bg-gray-50",
        sale.status === 'CANCELLED' && variant === 'default' && "grayscale opacity-70",
        className
      )}
      onClick={() => onClick?.(sale)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <MerchantAvatar 
          bankName={sale.targetBankName} 
          size={36}
        />
        <div className="min-w-0">
          <h4 className="text-[13px] font-bold text-[#111827] mb-0.5 capitalize truncate">
            {getStatusDescription(sale)}
          </h4>
          <p className="text-[#6B7280] text-[11px] font-medium uppercase tracking-tight">
            {formatDate(sale.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col items-end">
          <p className="text-[14px] font-bold text-[#111827] mb-0.5">
            {getAmountLabel(sale)}
          </p>
          <span className={cn(
            "text-[11px] font-medium",
            getStatusColor(sale.status)
          )}>
            {getStatusLabel(sale)}
          </span>
        </div>
        <ChevronRight className="text-[#9CA3AF]" size={18} />
      </div>
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
