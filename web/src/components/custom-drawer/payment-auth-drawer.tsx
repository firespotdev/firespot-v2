'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, X } from 'lucide-react'
import { Button, Input, Label, PhoneInput, Spinner } from '@/components/ui'
import { DrawerDescription } from '@/components/ui/drawer'
import { OtpVerification } from '@/components/auth/otp-verification'
import {
  useAuthStore,
  useRequestOtp,
  useVerifyOtp,
  useUpdateProfile,
} from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'

interface PaymentAuthDrawerProps {
  phoneNumber?: string
  initialStep?: 'phone' | 'otp' | 'name'
  onComplete: () => void
  onCancel?: () => void
  closeDrawer: () => void
}

function errorMessage(error: unknown) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || 'Could not continue. Please try again.'
  )
}

export function PaymentAuthDrawer({
  phoneNumber = '',
  initialStep = 'phone',
  onComplete,
  onCancel,
  closeDrawer: onClose,
}: PaymentAuthDrawerProps) {
  const [step, setStep] = useState(initialStep)
  const [phone, setPhone] = useState(phoneNumber)
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string>()
  const requestOtp = useRequestOtp()
  const verifyOtp = useVerifyOtp()
  const updateProfile = useUpdateProfile()
  const openDrawer = useDrawerStore((s) => s.openDrawer)
  const closeDrawer = useDrawerStore((s) => s.closeDrawer)
  const completed = useRef(false)
  const finish = () => {
    if (completed.current) return
    completed.current = true
    onComplete()
    closeDrawer('payment-verify')
    closeDrawer('payment-auth')
  }

  if (step === 'otp') {
    return (
      <OtpVerification
        phoneNumber={`+234${phone.replace(/^0/, '')}`}
        onBack={() => closeDrawer('payment-verify')}
        isLoading={verifyOtp.isPending || requestOtp.isPending}
        error={error}
        onResend={() => {
          setError(undefined)
          requestOtp.mutate(
            { phoneNumber: phone, phoneCountryCode: '+234' },
            { onError: (err) => setError(errorMessage(err)) },
          )
        }}
        onVerify={(otpCode) => {
          setError(undefined)
          verifyOtp.mutate(
            { phoneNumber: phone, phoneCountryCode: '+234', otpCode },
            {
              onSuccess: () => {
                if (useAuthStore.getState().user?.fullName?.trim()) finish()
                else setStep('name')
              },
              onError: (err) => setError(errorMessage(err)),
            },
          )
        }}
      />
    )
  }

  if (step === 'name') {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-125 flex-col bg-white px-4 py-6">
        <button
          type="button"
          aria-label="Back to payment"
          onClick={() => {
            onCancel?.()
            closeDrawer('payment-verify')
          }}
          className="mb-6 size-9"
          disabled={updateProfile.isPending}
        >
          <ArrowLeft />
        </button>
        <h1 className="text-xl font-bold text-black">Enter your full name</h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-[#00000080]">
          This is how your name will show up on payments you make to businesses
          on the platform.
        </p>
        <form
          className="mt-6 flex flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            if (!fullName.trim() || updateProfile.isPending) return
            setError(undefined)
            updateProfile.mutate(
              { fullName: fullName.trim() },
              {
                onSuccess: finish,
                onError: (err) => setError(errorMessage(err)),
              },
            )
          }}
        >
          <Label htmlFor="payment-full-name">Full name</Label>
          <Input
            id="payment-full-name"
            autoComplete="name"
            placeholder="Full name"
            maxLength={101}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={updateProfile.isPending}
          />
          {error && (
            <p role="alert" className="mt-2 text-xs text-[#FF002E]">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={!fullName.trim() || updateProfile.isPending}
            className="mt-auto"
          >
            {updateProfile.isPending ? <Spinner /> : 'Continue'}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <form
      className="overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      onSubmit={(event) => {
        event.preventDefault()
        if (requestOtp.isPending) return
        setError(undefined)
        requestOtp.mutate(
          { phoneNumber: phone, phoneCountryCode: '+234' },
          {
            onSuccess: () =>
              openDrawer({
                type: 'payment-verify',
                props: {
                  phoneNumber: phone,
                  initialStep: 'otp',
                  onComplete: finish,
                },
              }),
            onError: (err) => setError(errorMessage(err)),
          },
        )
      }}
    >
      <div className="flex h-11 items-center justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close payment sign in"
          className="-mr-2 flex size-11 items-center justify-center rounded-full text-[#222222] outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={24} />
        </button>
      </div>
      <div className="mt-2 flex flex-col items-center text-center">
        <Image
          src="/icons/android-chrome-192x192.png"
          alt="Firespot"
          width={48}
          height={48}
          className="shrink-0"
        />
        <h2 className="mt-5 text-xl font-bold leading-[130%] -tracking-[0.4px] text-black">
          Enter phone number to continue
        </h2>
        <DrawerDescription className="mt-2 text-sm font-medium leading-5 text-[#00000080]">
          We’ll send an OTP and your future receipts would be saved to this
          number on Firespot.
        </DrawerDescription>
      </div>
      <div className="mt-7">
        <Label htmlFor="payment-phone-number">Phone number</Label>
        <PhoneInput
          id="payment-phone-number"
          autoComplete="tel-national"
          value={phone}
          onChange={setPhone}
          disabled={requestOtp.isPending}
          error={!!error}
          aria-describedby={error ? 'payment-phone-error' : undefined}
          inputClassName="rounded-lg pl-24 text-base shadow-none placeholder:text-[#808080]"
        />
      </div>
      {error && (
        <p
          id="payment-phone-error"
          role="alert"
          className="mt-2 text-xs text-[#FF002E]"
        >
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="mt-6"
        disabled={
          phone.length < 10 || phone.length > 11 || requestOtp.isPending
        }
      >
        {requestOtp.isPending ? <Spinner /> : 'Continue'}
      </Button>
      <p className="mt-4 text-center text-[11px] font-medium leading-4 text-[#737373]">
        By continuing, a Firespot account would be created for you if you don’t
        already have one.{' '}
        <a
          href="https://firespot.co"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm underline underline-offset-2 outline-none hover:text-black focus-visible:ring-2 focus-visible:ring-ring"
        >
          Learn more
        </a>
      </p>
    </form>
  )
}
