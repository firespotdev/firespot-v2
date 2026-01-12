'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Label, Button, PhoneInput, Spinner } from '@/components/ui'

interface LoginFormProps {
  phoneNumber: string
  onPhoneNumberChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading?: boolean
  error?: string
}

export function LoginForm({
  phoneNumber,
  onPhoneNumberChange,
  onSubmit,
  isLoading = false,
  error,
}: LoginFormProps) {
  return (
    <div className="h-screen bg-white pt-8 pb-4 px-4 flex flex-col items-center font-satoshi">
      <Image
        src="/firespot_logo.svg"
        alt="firespot logo"
        width={48}
        height={48}
        className="mb-6"
      />
      <h1 className="font-bold text-xl text-black -tracking-[0.4px]">
        Welcome back
      </h1>
      <p className="font-medium text-sm text-[#00000080] max-w-[345px] text-center mb-6">
        Log in to your firespot transfer page
      </p>

      <form onSubmit={onSubmit} className="w-full max-w-[400px] space-y-6">
        <div>
          <Label>Phone number</Label>
          <PhoneInput
            className="w-full"
            value={phoneNumber}
            onChange={onPhoneNumberChange}
          />
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        <Button type="submit">{isLoading ? <Spinner /> : 'Continue'}</Button>
      </form>
      <p className="text-sm text-[#00000080] mt-8 font-bold font-satoshi">
        Don't have an account?{' '}
        <Link
          href="/signup"
          className="bg-linear-to-r from-[#D72483] to-[#FB5012] text-transparent bg-clip-text"
        >
          Sign Up
        </Link>
      </p>
    </div>
  )
}
