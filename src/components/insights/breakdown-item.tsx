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
          <div className="w-6 h-6 bg-[#0075FF] rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">
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
          className="w-6 h-6 rounded-md object-contain flex-shrink-0"
        />
      )
    }

    if (color) {
      return (
        <div
          className="w-6 h-6 rounded-md flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )
    }

    return null
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {renderIcon()}
        <span className="text-sm text-black font-medium">{label}</span>
      </div>
      <span className="text-sm text-[#00000066] font-medium">{percentage}%</span>
    </div>
  )
}
