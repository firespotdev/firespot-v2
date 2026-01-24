'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import type { DateRangePreset, InsightsQuery } from '@/services/insights'
import { DATE_RANGE_LABELS } from '@/services/insights'

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
    (currentFilter?.preset as DateRangePreset) || 'all_time'
  )
  const [startDate, setStartDate] = useState(currentFilter?.startDate || '')
  const [endDate, setEndDate] = useState(currentFilter?.endDate || '')

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
      <div className="bg-white rounded-2xl p-4 mb-4">
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
      <div className="bg-white rounded-2xl p-4 mb-6">
        <p className="text-xs text-[#00000066] font-medium mb-3">
          OR choose a specific date range
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                placeholder="From"
                className="w-full px-3 py-2.5 pr-10 border border-[#E5E7EB] rounded-xl text-sm text-black placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                placeholder="To"
                className="w-full px-3 py-2.5 pr-10 border border-[#E5E7EB] rounded-xl text-sm text-black placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
