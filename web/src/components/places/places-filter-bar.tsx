'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type PlacesVisitType = 'all' | 'in-person' | 'online'
export type PlacesDateRange = 'all' | '7' | '30' | '90'

interface FilterOption {
  label: string
  value: string
}

interface PlacesFilterProps {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

interface PlacesFilterBarProps {
  location: string
  locationOptions: FilterOption[]
  visitType: PlacesVisitType
  dateRange: PlacesDateRange
  onLocationChange: (value: string) => void
  onVisitTypeChange: (value: PlacesVisitType) => void
  onDateRangeChange: (value: PlacesDateRange) => void
}

function PlacesFilter({ label, value, options, onChange }: PlacesFilterProps) {
  const selectedOption = options.find((option) => option.value === value)
  const isActive = value !== 'all'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[#E5E7EB99] px-4 text-[10px] font-bold tracking-[1px] text-[#111827] uppercase transition-all',
            isActive && 'border border-black',
          )}
        >
          <span>{selectedOption?.label || label}</span>
          <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-40 max-w-64 rounded-xl border-[#E9EBED] p-1 shadow-[0px_4px_12px_rgba(0,0,0,0.08)]"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="py-2 pr-3 pl-7 text-[11px] font-medium uppercase data-[state=checked]:bg-[#F4F6F8] data-[state=checked]:font-bold"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PlacesFilterBar({
  location,
  locationOptions,
  visitType,
  dateRange,
  onLocationChange,
  onVisitTypeChange,
  onDateRangeChange,
}: PlacesFilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto bg-white px-3 py-2 scrollbar-hide">
      <PlacesFilter
        label="LOCATION"
        value={location}
        options={locationOptions}
        onChange={onLocationChange}
      />
      <PlacesFilter
        label="VISIT TYPE"
        value={visitType}
        options={[
          { label: 'VISIT TYPE', value: 'all' },
          { label: 'IN PERSON', value: 'in-person' },
          { label: 'ONLINE', value: 'online' },
        ]}
        onChange={(value) => onVisitTypeChange(value as PlacesVisitType)}
      />
      <PlacesFilter
        label="DATE RANGE"
        value={dateRange}
        options={[
          { label: 'DATE RANGE', value: 'all' },
          { label: 'LAST 7 DAYS', value: '7' },
          { label: 'LAST 30 DAYS', value: '30' },
          { label: 'LAST 90 DAYS', value: '90' },
        ]}
        onChange={(value) => onDateRangeChange(value as PlacesDateRange)}
      />
    </div>
  )
}
