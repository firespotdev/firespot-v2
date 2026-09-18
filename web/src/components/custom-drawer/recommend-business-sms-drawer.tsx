'use client'

import { X } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { Button, Label, PhoneInput } from '@/components/ui'
import { ShopAdd } from 'iconsax-reactjs'

interface RecommendBusinessSmsDrawerProps {
  recommendUrl: string
  businessName: string
  closeDrawer: () => void
}

export function RecommendBusinessSmsDrawer({
  recommendUrl,
  businessName,
  closeDrawer,
}: RecommendBusinessSmsDrawerProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const isValid = phoneNumber.length >= 10

  const smsBody = `${businessName} recommends Firespot for your business. Continue here: ${recommendUrl}`

  const handleContinue = () => {
    if (!isValid) return

    const normalizedPhoneNumber = phoneNumber.startsWith('0')
      ? phoneNumber.slice(1)
      : phoneNumber
    const smsUrl = `sms:+234${normalizedPhoneNumber}?body=${encodeURIComponent(
      smsBody,
    )}`

    window.open(smsUrl, '_blank')
  }

  return (
    <div className="mx-auto flex w-full max-w-125 flex-col bg-white px-4">
      <div className="flex justify-end py-3.5">
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close SMS invitation"
        >
          <X className="h-6 w-6 text-black" strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] bg-linear-to-br p-2 from-[#FB5012] to-[#D72483]">
          <ShopAdd size={32} color="white" />
          <div className="absolute -bottom-1.5 -right-1.5 rounded-[8px] border-2 border-white bg-white">
            <Image
              src="/images/firespot_logo.png"
              alt="Firespot"
              width={20}
              height={20}
              className="rounded-[6px]"
            />
          </div>
        </div>

        <h2 className="text-[20px] font-bold -tracking-[0.4px] text-black">
          Send an invitation via SMS
        </h2>
        <p className="mt-1.5 max-w-[360px] text-sm font-medium text-[#00000080]">
          They would get a link on this phone number to continue to their
          firespot profile.
        </p>
      </div>

      <div className="mt-6">
        <Label>Contact information</Label>
        <PhoneInput
          value={phoneNumber}
          onChange={setPhoneNumber}
          inputClassName="border-[#0000001A] text-base"
        />
      </div>

      <Button
        type="button"
        onClick={handleContinue}
        disabled={!isValid}
        className="mt-6 mb-6"
      >
        Continue
      </Button>
    </div>
  )
}
