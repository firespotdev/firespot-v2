'use client'

import { Suspense, useLayoutEffect, useRef, useState } from 'react'
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
import { useCreateQROrder, useQRKitPricing } from '@/services/qr-orders'
import { usePaystackRedirectState } from '@/hooks/usePaystackRedirectState'
import { PaystackRedirectingScreen } from '@/components/pay/paystack-redirecting-screen'
import { QRKitPreview } from '@/components/qr'
import { useAuthStore } from '@/services/auth'
import { usePlanCatalog } from '@/services/merchant-plans'
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
  const { pricing, isLoading: isPricingLoading, isFetching: isPricingFetching, isError: isPricingError, refetch: reloadPricing } = useQRKitPricing()
  const qrKitId = searchParams.get('qrKitId') || ''
  const isDigital = searchParams.get('kitType') === 'digital'
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data: planCatalog } = usePlanCatalog(isDigital && isAuthenticated)
  const includesLite = Boolean(
    planCatalog?.current &&
    !planCatalog.current.planTier &&
    planCatalog.current.planStatus === 'none' &&
    !planCatalog.current.pendingPlanChange,
  )
  const canChangeQuantity = !qrKitId && !isDigital
  const createOrder = useCreateQROrder()
  const checkoutBusy = useRef(false)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const { isRedirectingToPaystack, startPaystackRedirect, cancelPaystackRedirect } = usePaystackRedirectState()

  const [phoneNumber, setPhoneNumber] = useState('')
  const [state, setState] = useState('')
  const [lga, setLga] = useState('')
  const [address, setAddress] = useState('')
  const [quantity, setQuantity] = useState(1)

  useLayoutEffect(() => {
    const container = previewContainerRef.current
    const preview = previewRef.current
    if (!isDigital || isRedirectingToPaystack || !container || !preview) return

    const fitPreview = () => {
      setPreviewScale(Math.min(
        1,
        container.clientWidth / preview.offsetWidth,
        container.clientHeight / preview.offsetHeight,
      ))
    }
    fitPreview()
    const observer = new ResizeObserver(fitPreview)
    observer.observe(container)
    observer.observe(preview)
    return () => observer.disconnect()
  }, [isDigital, isRedirectingToPaystack])

  const clearForm = () => {
    setPhoneNumber('')
    setState('')
    setLga('')
    setAddress('')
    setQuantity(1)
  }

  const handleCheckout = () => {
    if (!isDigital && (!phoneNumber || !state || !lga || !address)) {
      showNotificationToast({
        message: 'All fields are required',
        duration: 3000,
      })
      return
    }

    openDrawer({
      type: 'checkout',
      props: {
        kitType: isDigital ? 'digital' : 'physical',
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

  const handleDigitalCheckout = async () => {
    if (checkoutBusy.current || isRedirectingToPaystack) return
    if (isPricingError || !Number.isFinite(pricing.kitPrice) || pricing.kitPrice <= 0) {
      await reloadPricing()
      return
    }
    checkoutBusy.current = true
    startPaystackRedirect()
    try {
      const order = await createOrder.mutateAsync({ kitType: 'digital', quantity: 1 })
      if (!order.authorizationUrl) throw new Error('Missing checkout URL')
      window.location.href = order.authorizationUrl
    } catch (error: unknown) {
      cancelPaystackRedirect()
      showNotificationToast({
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not start payment. Please try again.',
        mode: 'error',
      })
    } finally {
      checkoutBusy.current = false
    }
  }

  if (isRedirectingToPaystack) return <PaystackRedirectingScreen />

  if (isDigital) {
    const hasPrice = !isPricingError && Number.isFinite(pricing.kitPrice) && pricing.kitPrice > 0
    return (
      <div className="h-dvh overflow-hidden bg-white">
        <div className="relative mx-auto flex h-full max-w-125 flex-col overflow-hidden font-satoshi">
          <header className="sticky top-0 z-50 flex shrink-0 items-center justify-between bg-white px-4 py-4">
            <Link
              href="/activate"
              aria-label="Back to QR kit options"
              className="-ml-2 flex size-10 items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="size-6 text-black" />
            </Link>
            <div className="text-center">
              <h1 className="text-base font-bold text-black">Firespot digital QR kit</h1>
              <p className="text-xs font-medium text-[#6B7280]">One-time QR kit purchase</p>
            </div>
            <div className="size-6" aria-hidden="true" />
          </header>

          <main className="flex min-h-0 flex-1 flex-col items-center gap-4 px-4 py-4 text-center">
            <div ref={previewContainerRef} className="relative min-h-0 w-full flex-1">
              <div
                ref={previewRef}
                className="absolute left-1/2 top-1/2 w-75 origin-center"
                style={{ transform: `translate(-50%, -50%) scale(${previewScale})` }}
              >
                <QRKitPreview />
              </div>
            </div>
            <div className="shrink-0 text-center">
              <h2 className="mb-2 text-[28px] font-bold leading-none -tracking-[0.4px] text-black">Buy a digital QR kit</h2>
              <p className="mx-auto max-w-90 text-sm font-medium leading-5 text-[#00000080]">
                Get a QR kit you can share online or print, available after payment.
                {includesLite && ' Firespot Business LITE is included with your purchase.'}
              </p>
            </div>
          </main>

          <div className="shrink-0 rounded-t-[12px] border-t border-[#F1F1F1] p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <Button
              onClick={hasPrice ? handleDigitalCheckout : () => void reloadPricing()}
              disabled={isPricingLoading || isPricingFetching || createOrder.isPending}
              className="h-12 w-full rounded-[48px] bg-[#24C166] font-bold text-white hover:bg-[#24C166]"
            >
              {isPricingLoading || isPricingFetching
                ? 'Loading price…'
                : hasPrice
                  ? `Pay ${formatNaira(pricing.kitPrice)} to get this QR kit`
                  : 'Retry loading price'}
            </Button>
            {!isPricingLoading && !isPricingFetching && !hasPrice && (
              <p role="alert" className="mt-3 text-center text-sm leading-5 text-[#B42318]">The QR kit price is unavailable. Please try again.</p>
            )}
            <p className="mt-4 text-center text-[11px] font-medium leading-4 text-[#545F6CB2]">
              Payment happens only inside the app. Your digital QR kit has no delivery charge.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[500px] mx-auto pb-32 flex flex-col items-center">
          <div className="w-full py-3.5 px-3">
            <Link
              href={qrKitId ? `/qr-kits/${qrKitId}` : '/qr-kits'}
              aria-label={qrKitId ? 'Back to QR kit' : 'Back to QR kits'}
              className="-m-3 inline-flex min-h-11 min-w-11 items-center justify-center"
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
            {isDigital
              ? 'Get your digital QR kit'
              : isPricingLoading
                ? `Get your physical QR kit${canChangeQuantity ? 's' : ''} delivered`
                : `Get your physical QR kit${canChangeQuantity ? 's' : ''} delivered for ${formatNaira(
                    pricing.deliveryFee,
                  )}`}
          </h1>
          <p className="font-medium text-sm text-[#00000080] max-w-[345px] text-center mb-6">
            {isDigital
              ? 'Your digital QR kit includes Firespot Business LITE and is available after payment.'
              : 'Same day delivery in Lagos state. 3-5 business days for every other state in Nigeria. Firespot Business LITE is included.'}
          </p>


          {/* Form fields */}
          <div hidden={isDigital} className="w-full space-y-6 px-3">
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

      <div className="fixed bottom-0 left-0 right-0 w-full z-10">
        <div className="max-w-[500px] mx-auto bg-white border border-[#F1F1F1] rounded-t-[12px] shadow-[0px_-4px_24px_rgba(0,0,0,0.06)] p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-black leading-none mb-1">
              {quantity} {isDigital ? 'digital' : 'physical'} QR kit
              {quantity === 1 ? '' : 's'}
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
            disabled={
              isPricingLoading ||
              (!isDigital && (!state || !lga || !phoneNumber || !address))
            }
            className="rounded-full text-base font-bold w-fit"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
