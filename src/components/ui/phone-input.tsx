'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
  error?: boolean
}

function formatPhoneNumber(input: string) {
  // Remove all non-digits
  const digits = input.replace(/\D/g, '')

  // If starts with 0, format as 080 4528 9340 (3-4-4)
  if (digits.startsWith('0')) {
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 7) {
      return `${digits.slice(0, 3)} ${digits.slice(3)}`
    } else {
      return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(
        7,
        11,
      )}`
    }
  } else {
    // Format as 804 528 9340 (3-3-4)
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)} ${digits.slice(3)}`
    } else {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(
        6,
        10,
      )}`
    }
  }
}

export function PhoneInput({
  value,
  onChange,
  className,
  error,
}: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [phoneValue, setPhoneValue] = useState(() => {
    if (value) {
      const digits = value.replace(/\D/g, '')
      return formatPhoneNumber(digits)
    }
    return ''
  })

  // Sync with external value prop
  useEffect(() => {
    if (value !== undefined) {
      const digits = value.replace(/\D/g, '')
      const formatted = formatPhoneNumber(digits)
      if (formatted !== phoneValue) {
        setPhoneValue(formatted)
      }
    }
  }, [value, phoneValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const selectionStart = e.target.selectionStart
    const formatted = formatPhoneNumber(input)
    
    // Calculate new selection start
    let newSelectionStart = selectionStart || 0
    if (selectionStart !== null) {
      const digitsBefore = input.slice(0, selectionStart).replace(/\D/g, '').length
      let digitsCount = 0
      let i = 0
      for (; i < formatted.length && digitsCount < digitsBefore; i++) {
        if (/\d/.test(formatted[i])) {
          digitsCount++
        }
      }
      newSelectionStart = i
    }

    setPhoneValue(formatted)
    
    // Restore cursor position in next frame
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newSelectionStart, newSelectionStart)
      }
    })

    // Pass unformatted value to onChange
    const digits = input.replace(/\D/g, '')
    onChange?.(digits)
  }

  return (
    <div className={cn('relative', className)}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10">
        <div className="flex items-stretch h-4 w-6 rounded-[2px] overflow-hidden shadow-[0px_0px_8px_0px_#0000001F]">
          <div className="w-1/3 bg-[#2AB263]"></div>
          <div className="w-1/3 bg-white"></div>
          <div className="w-1/3 bg-[#2AB263]"></div>
        </div>
        <span className="text-base font-medium text-[#222222]">+234</span>
      </div>

      <Input
        ref={inputRef}
        type="tel"
        value={phoneValue}
        onChange={handleChange}
        placeholder="000 000 0000"
        maxLength={15}
        className={cn(
          'pl-28 font-medium',
          error &&
            'border-[#FF002E] focus-visible:border-[#FF002E] focus-visible:ring-[#FF002E]/20 focus-visible:ring-[3px]',
        )}
      />
    </div>
  )
}
