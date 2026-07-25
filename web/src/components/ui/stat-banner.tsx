import * as React from 'react'
import { ChevronDown, EyeOff } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { AppCard } from './app-card'

export interface StatBannerProps {
  label: string
  amount: number
  currency?: string
  badgeText?: string
  badgePositive?: boolean
  isHideable?: boolean
  isHidden?: boolean
  isLoading?: boolean
  onToggleVisibility?: () => void
  onLabelClick?: () => void
  className?: string
}

export function StatBanner({
  label,
  amount,
  currency = 'NGN',
  badgeText,
  badgePositive = true,
  isHideable = false,
  isHidden = false,
  isLoading = false,
  onToggleVisibility,
  onLabelClick,
  className,
}: StatBannerProps) {
  return (
    <AppCard
      rounded="12"
      padding="md"
      className={cn(
        'w-full flex justify-between items-center shrink-0',
        className,
      )}
    >
      <div className="w-full">
        <div className="flex items-center gap-1 mb-2 justify-between w-full">
          {onLabelClick ? (
            <button
              type="button"
              onClick={onLabelClick}
              className="flex items-center gap-1 text-[#00000066] text-xs font-medium hover:text-black transition-colors"
            >
              <span>{label}</span>
              <ChevronDown
                size={14}
                strokeWidth={2}
                className="text-[#00000066]"
              />
            </button>
          ) : (
            <span className="text-[#00000066] text-xs font-medium leading-none">
              {label}
            </span>
          )}

          {badgeText && (
            <span
              className={cn(
                'text-xs font-bold',
                badgePositive ? 'text-[#24C166]' : 'text-[#00000066]',
              )}
            >
              {badgeText}
            </span>
          )}
        </div>

        <div className="flex items-end justify-between gap-1.5">
          {isLoading ? (
            <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
          ) : (
            <h3 className="font-bold text-[22px] tracking-tight leading-none text-black">
              {isHidden
                ? `${currency} ••••••••`
                : `${currency} ${formatCurrency(amount)}`}
            </h3>
          )}

          {isHideable && onToggleVisibility && (
            <button
              type="button"
              onClick={onToggleVisibility}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <EyeOff size={16} className="text-[#00000066]" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </AppCard>
  )
}
