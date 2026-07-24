'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import {
  Button,
  LoaderCircle,
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
import { useQRKitPricing } from '@/services/qr-orders'
import {
  NIGERIAN_STATES,
  STATE_LGA_MAP,
} from '@/lib/utils/nigerian-states-lgas'

const formatNaira = (amount: number) =>
  `NGN ${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export default function OrderQRKitPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-white flex items-center justify-center">
          <LoaderCircle innerBg="#FFFFFF" />
        </div>
      }
    >
      <OrderQRKitPageContent />
    </Suspense>
  )
}

function OrderQRKitPageContent() {
  const searchParams = useSearchParams()
  const { openDrawer } = useDrawerStore()
  const { pricing, isLoading: isPricingLoading } = useQRKitPricing()
  const qrKitId = searchParams.get('qrKitId') || ''
  const canChangeQuantity = !qrKitId

  const [phoneNumber, setPhoneNumber] = useState('')
  const [state, setState] = useState('')
  const [lga, setLga] = useState('')
  const [address, setAddress] = useState('')
  const [quantity, setQuantity] = useState(1)

  const clearForm = () => {
    setPhoneNumber('')
    setState('')
    setLga('')
    setAddress('')
    setQuantity(1)
  }

  const handleCheckout = () => {
    if (!phoneNumber || !state || !lga || !address) {
      showNotificationToast({
        message: 'All fields are required',
        duration: 3000,
      })
      return
    }

    openDrawer({
      type: 'checkout',
      props: {
        qrKitId: qrKitId || undefined,
        phoneNumber,
        state,
        lga,
        address,
        quantity,
        canChangeQuantity,
        onQuantityChange: setQuantity,
        clearForm,
      },
    })
  }

  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[500px] mx-auto pb-32 flex flex-col items-center">
          <div className="w-full py-3.5 px-3">
            <Link
              href={qrKitId ? `/qr-kits/${qrKitId}` : '/qr-kits'}
              className="inline-flex h-6 w-6 items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5 text-black" strokeWidth={2} />
            </Link>
          </div>

          {/* Logo */}
          <Image
            src="/icons/firespot_logo.svg"
            alt="firespot logo"
            width={48}
            height={48}
            className="mb-4"
          />

          {/* Text */}
          <h1 className="font-bold text-xl text-black -tracking-[0.4px] text-center mb-1">
            {isPricingLoading
              ? `Get your physical QR kit${canChangeQuantity ? 's' : ''} delivered`
              : `Get your physical QR kit${canChangeQuantity ? 's' : ''} delivered for ${formatNaira(
                  pricing.deliveryFee,
                )}`}
          </h1>
          <p className="font-medium text-sm text-[#00000080] max-w-[345px] text-center mb-6">
            Same day delivery in Lagos state. 3-5 business days for every other
            states in Nigeria.
          </p>

          {/* Form fields */}
          <div className="w-full space-y-6 px-3">
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
        <div className="max-w-[500px] mx-auto bg-white border border-[#F1F1F1] rounded-t-[12px] shadow-[0px_-4px_24px_rgba(0,0,0,0.06)] p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-black leading-none mb-1">
              {quantity} physical QR kit{quantity === 1 ? '' : 's'}
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
            disabled={!state || !lga || !phoneNumber || !address}
            className="rounded-full text-base font-bold w-fit"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
