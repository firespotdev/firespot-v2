'use client'

import { ChevronRight } from 'lucide-react'
import type { ShopDaySchedule } from '@/services/auth/interface'
import { cn } from '@/lib/utils'
import { formatShopTime, SHOP_DAYS } from './schedule-utils'

interface ScheduleListProps {
  days: ShopDaySchedule[]
  onEdit?: (day: ShopDaySchedule) => void
  accent?: boolean
  className?: string
}

export function ScheduleList({
  days,
  onEdit,
  accent = false,
  className,
}: ScheduleListProps) {
  return (
    <div
      className={cn(
        'rounded-[12px] border border-[#F1F1F1] bg-white px-4 py-3 shadow-[0px_4px_8px_0px_#0000000A]',
        className,
      )}
    >
      {SHOP_DAYS.map(({ value, label }) => {
        const day = days.find((item) => item.day === value)!
        const content = (
          <>
            <span className="text-[15px] font-medium text-[#7D7D7D]">
              {label}
            </span>
            {day.enabled ? (
              <span
                className={cn(
                  'flex items-center gap-1 text-[15px] font-medium text-black',
                  accent && 'text-[#24A75A]',
                )}
              >
                {formatShopTime(day.opensAt)} - {formatShopTime(day.closesAt)}
                {onEdit && <ChevronRight className="h-4 w-4" />}
              </span>
            ) : (
              <span className="rounded-[5px] bg-[#9CA3AF] px-1.5 py-1 text-[10px] font-bold leading-none text-white">
                CLOSED
              </span>
            )}
          </>
        )

        if (day.enabled && onEdit) {
          return (
            <button
              key={value}
              type="button"
              onClick={() => onEdit(day)}
              className="flex min-h-10 w-full items-center justify-between gap-3 text-left"
            >
              {content}
            </button>
          )
        }

        return (
          <div
            key={value}
            className="flex min-h-10 items-center justify-between gap-3"
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}
