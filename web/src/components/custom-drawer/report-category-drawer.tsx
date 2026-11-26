'use client'

import { Check } from 'lucide-react'
import { ActionList, CircularIconButton } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { REPORT_CATEGORIES, type ReportCategory } from '@/services/reports'

interface ReportCategoryDrawerProps {
  selected?: ReportCategory
  onSelect: (category: ReportCategory) => void
}

/** "What went wrong?" picker for the Report issue form. */
export function ReportCategoryDrawer({
  selected,
  onSelect,
}: ReportCategoryDrawerProps) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const close = () => closeDrawer('report-category')

  return (
    <div className="flex flex-col font-satoshi">
      <header className="relative mb-2 flex h-13 w-full items-center justify-between px-4">
        <h2 className="w-full text-center text-[17px] font-bold leading-none text-black">
          What went wrong?
        </h2>
        <CircularIconButton icon="x" onClick={close} />
      </header>

      <div className="px-3 pb-6">
        <ActionList>
          {REPORT_CATEGORIES.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => {
                onSelect(category.value)
                close()
              }}
              className="flex h-[60px] w-full items-center justify-between border-b border-[#F1F1F1] px-[18px] text-left last:border-b-0"
            >
              <span className="text-[16px] font-medium text-[#111827]">
                {category.label}
              </span>
              {selected === category.value && (
                <Check size={20} strokeWidth={2.5} className="shrink-0 text-[#24C166]" />
              )}
            </button>
          ))}
        </ActionList>
      </div>
    </div>
  )
}
