'use client'

import { useState } from 'react'
import { FilterCapsule, Input, Label } from '@/components/ui'
import { cn } from '@/lib/utils'

const PRESET_DAYS = [7, 14, 30]
export const DEFAULT_POLICY_DAYS = 7
const MAX_POLICY_DAYS = 365

/** A time limit the API accepts: whole days from 1 to 365. */
export const isValidPolicyDays = (days: number | undefined) =>
  days !== undefined &&
  Number.isInteger(days) &&
  days >= 1 &&
  days <= MAX_POLICY_DAYS

interface PolicyTimeLimitProps {
  /** Undefined while a custom number is empty or invalid. */
  days: number | undefined
  onChange: (days: number | undefined) => void
  className?: string
}

// Four equal chips share one row, as in the design.
const CHIP_CLASS =
  'h-10 min-w-0 flex-1 justify-center px-2 text-[15px] font-medium border-transparent shadow-none'

/** "Applies within" choice for a shop policy: 7, 14 or 30 days, or custom. */
export function PolicyTimeLimit({
  days,
  onChange,
  className,
}: PolicyTimeLimitProps) {
  const [isCustom, setIsCustom] = useState(
    days !== undefined && !PRESET_DAYS.includes(days),
  )
  const [customValue, setCustomValue] = useState(
    isCustom && days !== undefined ? String(days) : '',
  )

  const choosePreset = (preset: number) => {
    setIsCustom(false)
    onChange(preset)
  }

  const chooseCustom = () => {
    setIsCustom(true)
    const parsed = Number(customValue)
    onChange(customValue && isValidPolicyDays(parsed) ? parsed : undefined)
  }

  const changeCustom = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 3)
    setCustomValue(digits)
    const parsed = Number(digits)
    onChange(digits && isValidPolicyDays(parsed) ? parsed : undefined)
  }

  return (
    <div className={className}>
      <Label className="text-[#545F6C]">Applies within</Label>
      <div className="mt-2 flex gap-2">
        {PRESET_DAYS.map((preset) => (
          <FilterCapsule
            key={preset}
            label={`${preset} days`}
            isActive={!isCustom && days === preset}
            onClick={() => choosePreset(preset)}
            className={cn(
              CHIP_CLASS,
              !(!isCustom && days === preset) && 'bg-[#E6E8EB]',
            )}
          />
        ))}
        <FilterCapsule
          label="Custom"
          isActive={isCustom}
          onClick={chooseCustom}
          className={cn(CHIP_CLASS, !isCustom && 'bg-[#E6E8EB]')}
        />
      </div>

      {isCustom && (
        <div className="mt-3">
          <Input
            type="text"
            inputMode="numeric"
            value={customValue}
            onChange={(event) => changeCustom(event.target.value)}
            placeholder="Number of days"
            aria-label="Number of days"
            aria-invalid={Boolean(customValue) && days === undefined}
            className="bg-white"
          />
          {customValue && days === undefined && (
            <p className="mt-1 text-xs font-medium text-[#FF002E]">
              Enter between 1 and {MAX_POLICY_DAYS} days
            </p>
          )}
        </div>
      )}
    </div>
  )
}
