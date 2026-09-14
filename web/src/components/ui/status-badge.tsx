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

  const isOwing = upperStatus === 'OWING' || upperStatus === 'OUTSTANDING'
  const isUnconfirmed = upperStatus === 'UNCONFIRMED' || upperStatus === 'PENDING'
  const isArchived = upperStatus === 'ARCHIVED' || upperStatus === 'CANCELLED'

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
      color: 'text-white',
      textColor: 'text-[#D72483]',
      Icon: Clock,
    },
    OUTSTANDING: {
      label: 'Owing',
      color: 'text-white',
      textColor: 'text-[#D72483]',
      Icon: Clock,
    },
    UNCONFIRMED: {
      label: 'Unconfirmed',
      color: 'text-white',
      textColor: 'text-[#BB8123]',
      Icon: Clock,
    },
    PENDING: {
      label: 'Unconfirmed',
      color: 'text-white',
      textColor: 'text-[#BB8123]',
      Icon: Clock,
    },
    ARCHIVED: {
      label: 'Archived',
      color: 'text-white',
      textColor: 'text-[#9CA3AF]',
      Icon: Archive,
    },
    CANCELLED: {
      label: 'Archived',
      color: 'text-white',
      textColor: 'text-[#9CA3AF]',
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
    if (isOwing) {
      return (
        <span
          className={cn('text-[11px] font-medium', className)}
          style={{
            background: 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {displayLabel}
        </span>
      )
    }
    return (
      <span
        className={cn('text-[11px] font-medium', config.textColor, className)}
      >
        {displayLabel}
      </span>
    )
  }

  if (variant === 'dot') {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span
          className={cn('w-2 h-2 rounded-full', !isOwing && !isUnconfirmed && !isArchived && config.color.split(' ')[0])}
          style={
            isOwing
              ? { background: 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)' }
              : isUnconfirmed
                ? { background: 'linear-gradient(0deg, #6B7280, #6B7280), linear-gradient(0deg, #BB8123, #BB8123)' }
                : isArchived
                  ? { backgroundColor: '#9CA3AF' }
                  : undefined
          }
        />
        <span
          className={cn('text-[14px] font-medium', !isOwing && config.textColor)}
          style={
            isOwing
              ? {
                  background: 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }
              : undefined
          }
        >
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
      style={
        isOwing
          ? { background: 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)' }
          : isUnconfirmed
            ? { background: 'linear-gradient(0deg, #6B7280, #6B7280), linear-gradient(0deg, #BB8123, #BB8123)' }
            : isArchived
              ? { backgroundColor: '#9CA3AF' }
              : undefined
      }
    >
      {icon && <IconComponent size={10} strokeWidth={2.5} />}
      {displayLabel}
    </span>
  )
}
