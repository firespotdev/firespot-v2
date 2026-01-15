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
    <div className="h-screen bg-white">
      <div className="max-w-[500px] mx-auto h-full pt-8 pb-4 px-4 flex flex-col items-center font-satoshi">
        <Image
          src="/icons/firespot_logo.svg"
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
              error={!!error}
            />
            {error && (
              <p className="text-[#FF002E] text-xs font-medium flex items-center gap-1 mt-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FF002E] text-white text-xs flex items-center justify-center">
                  !
                </span>
                {error}
              </p>
            )}
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
    </div>
  )
}
