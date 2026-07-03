import * as React from 'react'
import { Archive, Check, Clock, PencilLine, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TransactionStatusType =
  | 'CONFIRMED'
  | 'PENDING'
  | 'CANCELLED'
  | 'ARCHIVED'
  | 'EDITED'
  | 'OUTSTANDING'
  | string

export interface StatusBadgeProps {
  status: TransactionStatusType
  label?: string
  variant?: 'pill' | 'text' | 'dot'
  icon?: boolean
  className?: string
}

export function StatusBadge({
  status,
  label,
  variant = 'pill',
  icon = true,
  className,
}: StatusBadgeProps) {
  const upperStatus = (status || '').toUpperCase()

  const config = {
    PAID: {
      label: 'Paid',
      color: 'bg-[#24C166] text-white',
      textColor: 'text-[#24C166]',
      Icon: Check,
    },
    CONFIRMED: {
      label: 'Paid',
      color: 'bg-[#24C166] text-white',
      textColor: 'text-[#24C166]',
      Icon: Check,
    },
    OWING: {
      label: 'Owing',
      color: 'bg-[#FF9500] text-white',
      textColor: 'text-[#FF9500]',
      Icon: Clock,
    },
    OUTSTANDING: {
      label: 'Owing',
      color: 'bg-[#FF9500] text-white',
      textColor: 'text-[#FF9500]',
      Icon: Clock,
    },
    UNCONFIRMED: {
      label: 'Unconfirmed',
      color: 'bg-[#BB8123] text-white',
      textColor: 'text-[#BB8123]',
      Icon: Clock,
    },
    PENDING: {
      label: 'Unconfirmed',
      color: 'bg-[#BB8123] text-white',
      textColor: 'text-[#BB8123]',
      Icon: Clock,
    },
    ARCHIVED: {
      label: 'Archived',
      color: 'bg-[#8E8E93] text-white',
      textColor: 'text-[#8E8E93]',
      Icon: Archive,
    },
    CANCELLED: {
      label: 'Archived',
      color: 'bg-[#8E8E93] text-white',
      textColor: 'text-[#8E8E93]',
      Icon: Archive,
    },
    EDITED: {
      label: 'Edited',
      color: 'bg-[#8E8E93] text-white',
      textColor: 'text-[#8E8E93]',
      Icon: PencilLine,
    },
  }[upperStatus] || {
    label: upperStatus || 'Unknown',
    color: 'bg-[#8E8E93] text-white',
    textColor: 'text-[#8E8E93]',
    Icon: Check,
  }

  const displayLabel = label || config.label
  const IconComponent = config.Icon

  if (variant === 'text') {
    return (
      <span className={cn('text-[11px] font-medium', config.textColor, className)}>
        {displayLabel}
      </span>
    )
  }

  if (variant === 'dot') {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span className={cn('w-2 h-2 rounded-full', config.color.split(' ')[0])} />
        <span className={cn('text-[14px] font-medium', config.textColor)}>
          {displayLabel}
        </span>
      </div>
    )
  }

  return (
    <span
      className={cn(
        'text-[10px] font-bold rounded-full py-0.5 px-2 inline-flex items-center gap-1 shrink-0',
        config.color,
        className,
      )}
    >
      {icon && <IconComponent size={10} strokeWidth={2.5} />}
      {displayLabel}
    </span>
  )
}
