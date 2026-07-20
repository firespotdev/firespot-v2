'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import {
  Button,
  showNotificationToast,
  PhoneInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Input,
} from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import {
  NIGERIAN_STATES,
  STATE_LGA_MAP,
} from '@/lib/utils/nigerian-states-lgas'

export default function OrderQRKitPage() {
  const router = useRouter()
  const { openDrawer } = useDrawerStore()

  const [quantity, setQuantity] = useState<number | ''>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [state, setState] = useState('')
  const [lga, setLga] = useState('')
  const [address, setAddress] = useState('')

  const clearForm = () => {
    setQuantity('')
    setPhoneNumber('')
    setState('')
    setLga('')
    setAddress('')
  }

  const handleCheckout = () => {
    if (!quantity || !phoneNumber || !state || !lga || !address) {
      showNotificationToast({
        message: 'All fields are required',
        duration: 3000,
      })
      return
    }

    openDrawer({
      type: 'checkout',
      props: {
        initialQuantity: Number(quantity),
        phoneNumber,
        state,
        lga,
        address,
        clearForm,
      },
    })
  }

  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-125 mx-auto pt-8 px-4 pb-32 flex flex-col items-center font-satoshi">
          {/* Logo */}
          <Image
            src="/icons/firespot_logo.svg"
            alt="firespot logo"
            width={48}
            height={48}
            className="mb-6"
          />

          {/* Text */}
          <h1 className="font-bold text-xl text-black -tracking-[0.4px] text-center mb-1">
            Get a QR kit for just NGN 2,500
          </h1>
          <p className="font-medium text-sm text-[#00000080] max-w-[345px] text-center mb-8">
            Same day delivery in Lagos state. 3-5 business days for every other
            state in Nigeria.
          </p>

          {/* Form fields */}
          <div className="w-full space-y-6">
            {/* Quantity */}
            <div>
              <Label>Quantity</Label>
              <Select
                value={quantity.toString()}
                onValueChange={(val) => setQuantity(Number(val))}
              >
                <SelectTrigger className="font-medium h-11">
                  <SelectValue placeholder="Select quantity" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 10, 20].map((num) => (
                    <SelectItem
                      key={num}
                      value={num.toString()}
                      className="font-medium"
                    >
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone number */}
            <div>
              <Label>Phone number</Label>
              <PhoneInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                className="w-full"
              />
            </div>

            {/* State */}
            <div>
              <Label>State</Label>
              <Select
                onValueChange={(val) => {
                  setState(val)
                  setLga('') // Reset LGA when state changes
                }}
                value={state}
              >
                <SelectTrigger className="font-medium h-11 text-black">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {NIGERIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s} className="font-medium">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* LGA */}
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <Label>LGA (Local Government Area)</Label>
              <Select onValueChange={setLga} value={lga}>
                <SelectTrigger
                  disabled={!state}
                  className="font-medium h-11 text-black"
                >
                  <SelectValue placeholder="Select LGA" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {STATE_LGA_MAP[state]?.map((l) => (
                    <SelectItem key={l} value={l} className="font-medium">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delivery address */}
            <div>
              <Label>Delivery address</Label>
              <Input
                type="text"
                placeholder="Enter full address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="font-medium h-11"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-10">
        <div className="max-w-125 mx-auto bg-white border border-[#E5E7EB] rounded-t-[12px] shadow-[0px_-4px_24px_rgba(0,0,0,0.06)] p-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-black leading-none mb-1">
              {quantity || '0'} QR kits selected
            </h3>
            <button
              onClick={handleCheckout}
              className="text-[#888888] text-xs font-medium hover:text-black flex items-center gap-0.5"
            >
              View details <ChevronRight size={12} />
            </button>
          </div>
          <Button
            onClick={handleCheckout}
            disabled={!quantity || !state || !lga || !phoneNumber || !address}
            className="h-12 px-4 rounded-full text-base font-bold w-fit"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
