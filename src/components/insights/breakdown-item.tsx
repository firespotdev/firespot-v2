'use client'

import Image from 'next/image'
import { getBankLogoPath, getBankInitial } from '@/lib/utils/bank-logos'

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
      const logoPath = getBankLogoPath(label)
      const isDefaultLogo = logoPath.includes('default-image.png')

      if (isDefaultLogo) {
        return (
          <div className="w-4 h-4 bg-[#0075FF] rounded-[4.4px] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-[10px]">
              {getBankInitial(label)}
            </span>
          </div>
        )
      }

      return (
        <Image
          src={logoPath}
          alt={`${label} logo`}
          width={24}
          height={24}
          className="w-4 h-4 rounded-[4.4px] object-contain shrink-0"
        />
      )
    }

    if (color) {
      return (
        <div
          className="w-4 h-4 rounded-[4.4px] shrink-0"
          style={{ backgroundColor: color }}
        />
      )
    }

    return null
  }

  return (
    <div className="flex items-center justify-between">
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
