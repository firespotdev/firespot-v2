'use client'

import { BankLogo } from '@/components/ui/bank-logo'

interface BreakdownItemProps {
  label: string
  count: number
  total: number
  showBankLogo?: boolean
  color?: string
}

export function BreakdownItem({
  label,
  count,
  total,
  showBankLogo = false,
  color,
}: BreakdownItemProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0

  const renderIcon = () => {
    if (showBankLogo) {
      return (
        <BankLogo
          bankName={label}
          size={16}
          className="rounded-[4.4px] shrink-0"
        />
      )
    }

    if (color) {
      return (
        <div
          className="w-4 h-4 rounded-[4.4px] shrink-0"
          style={{ background: color }}
        />
      )
    }

    return null
  }

  return (
    <div className="flex items-center justify-between mb-2.5 last:mb-0">
      <div className="flex items-center gap-2">
        {renderIcon()}
        <span className="text-[13px] text-[#4C5563] font-medium">{label}</span>
      </div>
      <span className="text-[13px] text-[#4C5563] font-medium">
        {percentage}%
      </span>
    </div>
  )
}
