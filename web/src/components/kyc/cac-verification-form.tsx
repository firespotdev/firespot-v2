'use client'

import type { RefObject } from 'react'
import { Input, Label } from '@/components/ui'

interface CacVerificationFormProps {
  value: string
  error: string | null
  disabled?: boolean
  inputRef?: RefObject<HTMLInputElement | null>
  onChange: (value: string) => void
  onSubmit: () => void
}

export function CacVerificationForm({
  value,
  error,
  disabled = false,
  inputRef,
  onChange,
  onSubmit,
}: CacVerificationFormProps) {
  return (
    <form
      id="cac-verification-form"
      className="mt-6"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <Label htmlFor="cac-registration-number">CAC registration number</Label>
      <Input
        ref={inputRef}
        id="cac-registration-number"
        name="cacRegistrationNumber"
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        maxLength={64}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? 'cac-registration-error' : 'cac-registration-hint'
        }
        placeholder="Enter your CAC number"
        className="font-medium uppercase h-11 rounded-[12px]"
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p
          id="cac-registration-error"
          role="alert"
          className="mt-1.5 text-xs font-medium leading-[135%] text-[#FF002E] break-words"
        >
          {error}
        </p>
      ) : null}
    </form>
  )
}
