'use client'

import type { ShopDay, ShopDaySchedule } from '@/services/auth/interface'
import { cn } from '@/lib/utils'
import { SHOP_DAYS } from './schedule-utils'

interface DaySelectorProps {
  days: ShopDaySchedule[]
  onChange: (days: ShopDaySchedule[]) => void
  className?: string
}

export function DaySelector({ days, onChange, className }: DaySelectorProps) {
  const toggleDay = (value: ShopDay) => {
    onChange(
      days.map((day) =>
        day.day === value ? { ...day, enabled: !day.enabled } : day,
      ),
    )
  }

  return (
    <div className={cn('grid grid-cols-7 gap-2', className)}>
      {SHOP_DAYS.map(({ value, short, label }) => {
        const active = days.find((day) => day.day === value)?.enabled === true
        return (
          <button
            key={value}
            type="button"
            aria-label={`${active ? 'Close' : 'Open'} ${label}`}
            aria-pressed={active}
            onClick={() => toggleDay(value)}
            className={cn(
              'aspect-square min-w-0 rounded-[12px] border text-sm font-medium transition-colors',
              active
                ? 'border-[#DDDDDD] bg-[#24C166] text-white'
                : 'border-[#DDDDDD] bg-[#F1F1F1] text-[#22222299]',
            )}
          >
            {short}
          </button>
        )
      })}
    </div>
  )
}
