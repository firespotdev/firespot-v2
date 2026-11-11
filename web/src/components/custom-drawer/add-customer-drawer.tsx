'use client'

import { useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  PhoneInput,
  showNotificationToast,
  Spinner,
  ContactCardIcon,
} from '@/components/ui'
import { useCreateCustomer } from '@/services/customers/hooks'
import { useDrawerStore } from '@/services/drawer'
import type { Customer } from '@/services/customers/customersApi'

interface AddCustomerDrawerProps {
  onSelect: (customer: Customer) => void
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
        onError: (err: unknown) => {
          const message = (
            err as { response?: { data?: { message?: string } } }
          )?.response?.data?.message
          showNotificationToast({
            message: message || 'Failed to add customer.',
            mode: 'error',
          })
        },
      },
    )
  }

  const isValid = firstName.trim().length > 0 && phoneValue.length >= 10

  return (
    <div className="w-full flex flex-col font-satoshi px-4 pb-4 max-w-125 mx-auto">
      <div
        className={`w-full flex py-2 ${onBack ? 'justify-start' : 'justify-end'}`}
      >
        {onBack ? (
          <button
            onClick={onBack}
            type="button"
            aria-label="Back"
            className="-m-1 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
          >
            <ArrowLeft size={24} color="black" />
          </button>
        ) : (
          <button
            onClick={closeDrawer}
            type="button"
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
          >
            <X size={24} color="black" />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center text-center">
        <ContactCardIcon className="mb-4" />

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

            <div>
              <PhoneInput
                className="w-full"
                inputClassName="w-full font-medium h-12 border-[#0000001A] border-t-[0.5px] rounded-none rounded-b-[8px] focus-visible:z-10 focus-visible:relative"
                value={phoneValue}
                onChange={setPhoneValue}
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleCreateCustomer}
          disabled={!isValid || createCustomerMutation.isPending}
          className="mt-6 active:scale-[0.98]"
        >
          {createCustomerMutation.isPending ? <Spinner /> : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
