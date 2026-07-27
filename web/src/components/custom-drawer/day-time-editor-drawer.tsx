'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { ShopDay, ShopDaySchedule } from '@/services/auth/interface'
import { Button } from '@/components/ui'
import { TimeRangeField } from '@/components/shop/time-range-field'
import {
  SHOP_DAYS,
  updateDaySchedule,
} from '@/components/shop/schedule-utils'

interface DayTimeEditorDrawerProps {
  days: ShopDaySchedule[]
  initialDay: ShopDay
  onSave: (days: ShopDaySchedule[]) => void
  closeDrawer: () => void
}

export function DayTimeEditorDrawer({
  days,
  initialDay,
  onSave,
  closeDrawer,
}: DayTimeEditorDrawerProps) {
  const enabledDays = useMemo(
    () => SHOP_DAYS.filter(({ value }) =>
      days.some((day) => day.day === value && day.enabled),
    ),
    [days],
  )
  const initialIndex = Math.max(
    0,
    enabledDays.findIndex(({ value }) => value === initialDay),
  )
  const [index, setIndex] = useState(initialIndex)
  const [draftDays, setDraftDays] = useState(days)

  const meta = enabledDays[index]
  const current = draftDays.find((day) => day.day === meta.value)!
  const isValid =
    Boolean(current.opensAt && current.closesAt) &&
    current.opensAt !== current.closesAt
  const configuredCount = draftDays.filter(
    (day) =>
      day.enabled &&
      day.opensAt &&
      day.closesAt &&
      day.opensAt !== day.closesAt,
  ).length
  const isLast = index === enabledDays.length - 1

  const updateCurrent = (changes: Partial<ShopDaySchedule>) => {
    const updated = {
      ...current,
      ...changes,
    }
    updated.closesNextDay = Boolean(
      updated.opensAt &&
        updated.closesAt &&
        updated.closesAt < updated.opensAt,
    )
    setDraftDays((existing) => updateDaySchedule(existing, updated))
  }

  const commitAnd = (next: () => void) => {
    if (!isValid) return
    onSave(draftDays)
    next()
  }

  return (
    <div className="w-full bg-[#F5F6F8] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] font-satoshi">
      <div className="flex items-center justify-between py-3">
        <div className="h-9 w-9" />
        <h2 className="text-[15px] font-bold text-black">{meta.label}</h2>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close time editor"
          className="flex h-9 w-9 items-center justify-center"
        >
          <X className="h-5 w-5 text-black" />
        </button>
      </div>

      <div className="rounded-[12px] bg-white p-4 shadow-[0px_4px_8px_0px_#0000000A]">
        <p className="mb-2 text-xs font-medium text-[#545F6C]">{meta.label}</p>
        <TimeRangeField
          opensAt={current.opensAt}
          closesAt={current.closesAt}
          onOpenChange={(opensAt) => updateCurrent({ opensAt })}
          onCloseChange={(closesAt) => updateCurrent({ closesAt })}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            onSave(draftDays)
            closeDrawer()
          }}
          className="text-left"
        >
          <span className="block text-[13px] font-bold text-black">
            {configuredCount} of {enabledDays.length} set
          </span>
          <span className="mt-0.5 block text-xs font-medium text-[#9CA3AF]">
            View all ›
          </span>
        </button>

        <div className="flex items-center gap-2">
          {index > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIndex((currentIndex) => currentIndex - 1)}
              className="h-11 w-fit px-5"
            >
              Previous
            </Button>
          )}
          <Button
            type="button"
            disabled={!isValid}
            onClick={() =>
              commitAnd(() => {
                if (isLast) closeDrawer()
                else setIndex((currentIndex) => currentIndex + 1)
              })
            }
            className="h-11 w-fit px-5"
          >
            {isLast ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}
