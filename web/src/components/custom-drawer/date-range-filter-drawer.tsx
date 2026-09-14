'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import type { DateRangePreset, InsightsQuery } from '@/services/insights'
import { DATE_RANGE_LABELS } from '@/services/insights'
import { Input } from '@/components/ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

interface DateRangeFilterDrawerProps {
  currentFilter?: InsightsQuery
  onApply?: (filter: InsightsQuery) => void
  closeDrawer?: () => void
}

const PRESETS: DateRangePreset[] = [
  'all_time',
  'today',
  'this_week',
  'last_7_days',
  'last_30_days',
  'last_90_days',
]

export function DateRangeFilterDrawer({
  currentFilter,
  onApply,
  closeDrawer,
}: DateRangeFilterDrawerProps) {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(
    (currentFilter?.preset as DateRangePreset) || 'all_time',
  )
  const [startDate, setStartDate] = useState(currentFilter?.startDate || '')
  const [endDate, setEndDate] = useState(currentFilter?.endDate || '')
  const [openStart, setOpenStart] = useState(false)
  const [openEnd, setOpenEnd] = useState(false)

  const handlePresetSelect = (preset: DateRangePreset) => {
    setSelectedPreset(preset)
    // Clear custom dates when selecting a preset
    if (preset !== 'custom') {
      setStartDate('')
      setEndDate('')
      // Apply filter immediately for presets
      onApply?.({ preset })
      closeDrawer?.()
    }
  }

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value)
    } else {
      setEndDate(value)
      // Apply filter when end date is selected and both dates are set
      if (value && startDate) {
        setSelectedPreset('custom')
        const filter: InsightsQuery = {
          preset: 'custom',
          startDate,
          endDate: value,
        }
        onApply?.(filter)
        closeDrawer?.()
      }
    }
    // When setting custom dates, switch to custom preset
    if (value) {
      setSelectedPreset('custom')
    }
  }

  return (
    <div className="px-4 pb-6 pt-2">
      {/* Preset Options */}
      <div className="bg-white rounded-[12px] p-4 mb-4 shadow-[0px_4px_8px_0px_#0000000A]">
        <p className="text-xs text-[#00000066] font-medium mb-3">
          Filter by date range
        </p>
        <div className="space-y-1">
          {PRESETS.map((preset) => (
            <label
              key={preset}
              className="flex items-center gap-3 py-2 cursor-pointer"
              onClick={() => handlePresetSelect(preset)}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPreset === preset
                    ? 'border-black'
                    : 'border-[#CED7E1]'
                }`}
              >
                {selectedPreset === preset && (
                  <div className="w-2.5 h-2.5 rounded-full bg-black" />
                )}
              </div>
              <span className="text-sm font-medium text-black">
                {DATE_RANGE_LABELS[preset]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="bg-white rounded-[12px] p-4 shadow-[0px_4px_8px_0px_#0000000A]">
        <p className="text-xs text-[#00000066] font-medium mb-3">
          OR choose a specific date range
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <Popover open={openStart} onOpenChange={setOpenStart}>
              <PopoverTrigger asChild>
                <button className="relative w-full text-left cursor-pointer">
                  <Input
                    type="text"
                    placeholder="From"
                    value={
                      startDate ? format(new Date(startDate), 'yyyy-MM-dd') : ''
                    }
                    readOnly
                    className="pr-10 cursor-pointer pointer-events-none"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate ? new Date(startDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      handleCustomDateChange(
                        'start',
                        format(date, 'yyyy-MM-dd'),
                      )
                      setOpenStart(false)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1">
            <Popover open={openEnd} onOpenChange={setOpenEnd}>
              <PopoverTrigger asChild disabled={!startDate}>
                <button
                  className="relative w-full text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!startDate}
                >
                  <Input
                    type="text"
                    placeholder="To"
                    value={
                      endDate ? format(new Date(endDate), 'yyyy-MM-dd') : ''
                    }
                    readOnly
                    disabled={!startDate}
                    className="pr-10 cursor-pointer pointer-events-none"
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate ? new Date(endDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      handleCustomDateChange('end', format(date, 'yyyy-MM-dd'))
                      setOpenEnd(false)
                    }
                  }}
                  disabled={(date) => {
                    if (!startDate) return true
                    const start = new Date(startDate)
                    start.setHours(0, 0, 0, 0)
                    return date < start
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  )
}
