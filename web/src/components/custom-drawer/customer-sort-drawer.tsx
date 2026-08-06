'use client'

import { Check } from 'lucide-react'

export type CustomerSortOption =
  | 'spent_desc'
  | 'spent_asc'
  | 'visits_asc'
  | 'visits_desc'
  | 'last_visit_desc'
  | 'last_visit_asc'
  | 'first_visit_desc'
  | 'first_visit_asc'

export interface CustomerSortOptionItem {
  id: CustomerSortOption
  label: string
}

export const CUSTOMER_SORT_OPTIONS: CustomerSortOptionItem[] = [
  { id: 'spent_desc', label: 'Amount spent (high to low)' },
  { id: 'spent_asc', label: 'Amount spent (low to high)' },
  { id: 'visits_asc', label: 'Frequency of visit (low to high)' },
  { id: 'visits_desc', label: 'Frequency of visit (high to low)' },
  { id: 'last_visit_desc', label: 'Last visit date (newest first)' },
  { id: 'last_visit_asc', label: 'Last visit date (oldest first)' },
  { id: 'first_visit_desc', label: 'First time visit (newest first)' },
  { id: 'first_visit_asc', label: 'First time visit (oldest first)' },
]

interface CustomerSortDrawerProps {
  selectedSort?: CustomerSortOption
  onSelectSort?: (option: CustomerSortOption) => void
  closeDrawer?: () => void
}

export function CustomerSortDrawer({
  selectedSort = 'spent_desc',
  onSelectSort,
  closeDrawer,
}: CustomerSortDrawerProps) {
  const handleSelect = (optionId: CustomerSortOption) => {
    onSelectSort?.(optionId)
    closeDrawer?.()
  }

  return (
    <div className="px-4 border-t border-[#f1f1f1]">
      <div className="flex flex-col divide-y divide-[#F1F1F1]">
        {CUSTOMER_SORT_OPTIONS.map((option) => {
          const isSelected = selectedSort === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className="flex items-center justify-between py-4 text-left transition-colors cursor-pointer"
            >
              <span className="text-[16px] font-medium text-black leading-tight">
                {option.label}
              </span>
              {isSelected && (
                <Check
                  size={20}
                  className="text-[#24C166] shrink-0"
                  strokeWidth={2.5}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
