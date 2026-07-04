'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button, Input, Label, PhoneInput } from '@/components/ui'
import { useCreateCustomer } from '@/services/customers/hooks'
import { useDrawerStore } from '@/services/drawer'
import Image from 'next/image'

interface AddCustomerDrawerProps {
  onSelect: (customer: any) => void
  onBack?: () => void
}

export function AddCustomerDrawer({
  onSelect,
  onBack,
}: AddCustomerDrawerProps) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const createCustomerMutation = useCreateCustomer()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneValue, setPhoneValue] = useState('')

  const handleCreateCustomer = () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
    if (!fullName || !phoneValue) return

    createCustomerMutation.mutate(
      { name: fullName, phoneNumber: phoneValue },
      {
        onSuccess: (newCust) => {
          onSelect(newCust)
        },
        onError: (err: any) => {
          alert(err?.response?.data?.message || 'Failed to add customer.')
        },
      },
    )
  }

  const isValid = firstName.trim().length > 0 && phoneValue.length >= 10

  return (
    <div className="w-full flex flex-col font-satoshi px-4 pb-4 max-w-125 mx-auto">
      <div className="w-full flex justify-end py-2">
        <button
          onClick={onBack || closeDrawer}
          type="button"
          className="py-1.5 transition-colors cursor-pointer"
        >
          <X size={24} color="black" />
        </button>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-[14px] bg-linear-to-br from-[#FB5012] to-[#D72483] flex items-center justify-center relative mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M17 21H7c-4 0-5-1-5-5V8c0-4 1-5 5-5h10c4 0 5 1 5 5v8c0 4-1 5-5 5ZM14 8h5M15 12h4M17 16h2"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 11.29a1.81 1.81 0 1 0 0-3.62 1.81 1.81 0 0 0 0 3.62ZM12 16.33a3.02 3.02 0 0 0-2.74-2.72 7.72 7.72 0 0 0-1.52 0A3.03 3.03 0 0 0 5 16.33"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="absolute -bottom-1.5 -right-1.5 w-5.5 h-5.5 rounded-[8px] border-2 border-white flex items-center justify-center">
            <Image
              src="/images/firespot_logo.png"
              alt="add"
              width={24}
              height={24}
              className="object-cover rounded-[6px]"
            />
          </div>
        </div>

        <h2 className="text-[20px] font-bold text-black mb-1 -tracking-[0.4px]">
          Add new customer
        </h2>

        <p className="text-sm font-medium text-[#00000080] mb-6 leading-normal">
          Your customer would get a link on this phone number to continue to
          their firespot profile.
        </p>

        <div className="w-full text-left">
          <Label>Contact information</Label>
          <div className="flex flex-col bg-white rounded-[8px] transition-all">
            <div className="grid grid-cols-2">
              <Input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full font-medium h-12 border-[#0000001A] border-r-[0.5px] border-b-[0.5px] rounded-none rounded-tl-[8px]"
              />
              <Input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full font-medium h-12 border-[#0000001A] border-l-[0.5px] border-b-[0.5px] rounded-none rounded-tr-[8px] focus-visible:z-10 focus-visible:relative"
              />
            </div>

            <PhoneInput
              className="w-full"
              inputClassName="w-full font-medium h-12 border-[#0000001A] border-t-[0.5px] rounded-none rounded-b-[8px] focus-visible:z-10 focus-visible:relative"
              value={phoneValue}
              onChange={setPhoneValue}
            />
          </div>
        </div>

        <Button
          onClick={handleCreateCustomer}
          disabled={!isValid || createCustomerMutation.isPending}
          className="mt-6 active:scale-[0.98]"
        >
          {createCustomerMutation.isPending ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
