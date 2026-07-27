'use client'

import { useId } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatShopTime } from './schedule-utils'

interface TimePickerFieldProps {
  label: string
  value?: string
  onChange: (value: string) => void
  className?: string
}

function TimePickerField({
  label,
  value,
  onChange,
  className,
}: TimePickerFieldProps) {
  const id = useId()

  return (
    <label
      htmlFor={id}
      className={cn(
        'relative flex h-11 flex-1 cursor-pointer items-center justify-between rounded-[8px] border border-[#DDDDDD] px-4 text-base font-medium shadow-xs',
        className,
      )}
    >
      <span className={value ? 'text-black' : 'text-[#22222299]'}>
        {value ? formatShopTime(value) : label}
      </span>
      <CalendarDays size={16} className="text-[#9CA3AF]" />
      <input
        id={id}
        type="time"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      />
    </label>
  )
}

interface TimeRangeFieldProps {
  opensAt?: string
  closesAt?: string
  onOpenChange: (value: string) => void
  onCloseChange: (value: string) => void
  className?: string
}

export function TimeRangeField({
  opensAt,
  closesAt,
  onOpenChange,
  onCloseChange,
  className,
}: TimeRangeFieldProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      <TimePickerField label="From" value={opensAt} onChange={onOpenChange} />
      <TimePickerField label="To" value={closesAt} onChange={onCloseChange} />
    </div>
  )
}
