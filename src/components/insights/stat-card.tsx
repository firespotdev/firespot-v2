'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

interface StatCardProps {
  title: string
  description?: string
  value: number | string
  children?: React.ReactNode
  expandable?: boolean
  navigable?: boolean
  onNavigate?: () => void
}

export function StatCard({
  title,
  description,
  value,
  children,
  expandable = false,
  navigable = false,
  onNavigate,
}: StatCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const handleClick = () => {
    if (navigable && onNavigate) {
      onNavigate()
    } else if (expandable && children) {
      setIsExpanded(!isExpanded)
    }
  }

  const isClickable = navigable || (expandable && children)

  return (
    <div className="border-[#0000000D] last:border-b border-t">
      <button
        type="button"
        onClick={handleClick}
        disabled={!isClickable}
        className={`w-full flex items-start justify-between pt-3.5 pb-2.5 ${
          isClickable ? 'cursor-pointer' : 'cursor-default'
        } ${expandable ? 'pb-2.5' : 'pb-3.5'}`}
      >
        <div className="flex flex-col items-start">
          <h3 className="text-[15px] font-bold text-black">{title}</h3>
          {description && (
            <p className="text-[13px] font-medium text-[#00000099] mt-0.5">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-black">{value}</span>
          {expandable &&
            children &&
            (isExpanded ? (
              <ChevronDown className="w-4 h-4 text-black" />
            ) : (
              <ChevronRight className="w-4 h-4 text-black" />
            ))}
          {navigable && <ChevronRight className="w-4 h-4 text-black" />}
        </div>
      </button>
      {expandable && children && isExpanded && (
        <div className="pb-6">{children}</div>
      )}
    </div>
  )
}
