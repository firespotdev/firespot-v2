'use client'

import { Minus, Plus } from 'lucide-react'

interface NumberStepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  displayValue?: string
  className?: string
}

export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  displayValue,
  className,
}: NumberStepperProps) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium text-[#64748B]">{label}</p>
      <div className="flex h-11 items-center justify-between rounded-[10px] border border-[#D1D5DB] bg-white px-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="flex h-9 w-9 items-center justify-center text-[#9CA3AF] disabled:opacity-40"
        >
          <Minus className="h-5 w-5" />
        </button>
        <span className="text-base font-medium text-[#111827]">
          {displayValue ?? value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="flex h-9 w-9 items-center justify-center text-[#9CA3AF] disabled:opacity-40"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
