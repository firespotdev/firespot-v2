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
    <div className="border-b border-[#F1F1F1] last:border-b-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={!isClickable}
        className={`w-full flex items-center justify-between py-4 ${
          isClickable ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="flex flex-col items-start">
          <h3 className="text-base font-bold text-black">{title}</h3>
          {description && (
            <p className="text-xs text-[#00000066] mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-base font-bold text-black">{value}</span>
          {expandable && children && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[#00000066]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#00000066]" />
            )
          )}
          {navigable && (
            <ChevronRight className="w-4 h-4 text-[#00000066]" />
          )}
        </div>
      </button>
      {expandable && children && isExpanded && (
        <div className="pb-4">{children}</div>
      )}
    </div>
  )
}
