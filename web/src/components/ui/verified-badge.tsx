'use client'

import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VerifiedBadgeProps {
  level?: 'PRO' | 'PROMAX' | null
  showLabel?: boolean
  className?: string
}

/**
 * Verification badge earned by completing a tier's KYC.
 * PRO → "Verified User" (blue). PRO MAX → "Verified Business" (gold).
 * LITE grants no badge, so a null level renders nothing.
 */
export function VerifiedBadge({
  level,
  showLabel = false,
  className,
}: VerifiedBadgeProps) {
  if (!level) return null

  const isBusiness = level === 'PROMAX'
  const color = isBusiness ? '#F5A623' : '#1D9BF0'
  const label = isBusiness ? 'Verified Business' : 'Verified User'

  return (
    <span
      className={cn('inline-flex items-center gap-1 shrink-0', className)}
      title={label}
    >
      <BadgeCheck className="w-4 h-4" style={{ color }} fill={color} stroke="#fff" />
      {showLabel && (
        <span className="text-xs font-medium" style={{ color }}>
          {label}
        </span>
      )}
    </span>
  )
}
