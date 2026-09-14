import * as React from 'react'
import { cn } from '@/lib/utils'

export interface FilterCapsuleProps {
  label: string
  isActive?: boolean
  onClick?: () => void
  icon?: React.ReactNode
  className?: string
}

export function FilterCapsule({
  label,
  isActive = false,
  onClick,
  icon,
  className,
}: FilterCapsuleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border shrink-0',
        isActive
          ? 'bg-black text-white border-black shadow-sm'
          : 'bg-white text-black border-[#E9EBED] hover:bg-gray-50 active:bg-gray-100',
        className,
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
