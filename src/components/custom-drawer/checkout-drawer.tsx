'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronDown, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'
import { useCreateQROrder, useQRKitPricing } from '@/services/qr-orders'
import { useRouter } from 'next/navigation'
import { showNotificationToast } from '@/components/ui'

const formatNaira = (amount: number) =>
  `NGN ${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
type ApiError = {
  response?: {
    data?: {
      message?: string
    }
  }
}

interface CheckoutDrawerProps {
  qrKitId?: string
  phoneNumber: string
  state: string
  lga: string
  address: string
  quantity: number
  canChangeQuantity: boolean
  onQuantityChange: (quantity: number) => void
  clearForm: () => void
}

export const CheckoutDrawer = ({
  qrKitId,
  phoneNumber,
  state,
  lga,
  address,
  quantity: initialQuantity,
  canChangeQuantity,
  onQuantityChange,
  clearForm,
}: CheckoutDrawerProps) => {
  const { closeDrawer } = useDrawerStore()
  const router = useRouter()
  const createOrderMutation = useCreateQROrder()
  const { pricing, isLoading: isPricingLoading } = useQRKitPricing()

  const [quantity, setQuantity] = useState(initialQuantity)
  const maximumQuantity = Math.max(1, pricing.maxKitsPerOrder)
  const subtotal = pricing.kitPrice * quantity
  const total = subtotal + pricing.deliveryFee
  const isFree = !isPricingLoading && total === 0
  const priceOrPlaceholder = (amount: number) =>
    isPricingLoading ? '—' : formatNaira(amount)

  const updateQuantity = (nextQuantity: number) => {
    setQuantity(nextQuantity)
    onQuantityChange(nextQuantity)
  }

  const handleClear = () => {
    setQuantity(1)
    clearForm()
    closeDrawer()
  }

  const handlePay = () => {
    if (!quantity || !phoneNumber || !state || !address) {
      showNotificationToast({
        message: 'Missing order details',
        duration: 3000,
      })
      return
    }

    createOrderMutation.mutate(
      {
        qrKitId,
        quantity,
        phoneNumber,
        state,
        lga,
        deliveryAddress: address,
      },
      {
        onSuccess: (data) => {
          // Free order: already settled server-side, no payment step follows.
          if (data?.isFree) {
            clearForm()
            closeDrawer()
            router.push('/order-status?status=success')
            return
          }

          if (data?.authorizationUrl) {
            // Redirect to Paystack
            window.location.href = data.authorizationUrl
            return
          }

          showNotificationToast({
            message: 'Error initializing payment',
            duration: 3000,
          })
        },
        onError: (error: unknown) => {
          const apiError = error as ApiError
          showNotificationToast({
            message:
              apiError.response?.data?.message || 'Failed to create order',
            duration: 3000,
          })
        },
      },
    )
  }

  return (
    <div className="flex flex-col bg-white rounded-t-[12px] pb-4 font-satoshi">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#F1F1F1]">
        <ChevronDown color="black" strokeWidth={2.5} onClick={closeDrawer} />
        <div className="flex flex-col items-center">
          <h2 className="text-[16px] font-bold text-black">Checkout</h2>

          <div className="flex items-end gap-1 mt-1">
            <span className="text-[14px] text-[#00000080] font-medium">
              Complete order @firespot
            </span>
            <Image
              src="/icons/verified.svg"
              alt="Verified"
              width={13}
              height={13}
            />
          </div>
        </div>
        <button
          onClick={handleClear}
          className="text-xs font-medium text-black underline underline-offset-3"
        >
          Clear
        </button>
      </div>

      {/* Item Section */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="space-y-1">
            <h3 className="text-[14px] font-bold text-[#111827]">
              Physical unit of your QR kit
            </h3>
            <p className="text-[14px] text-[#9CA3AF] font-medium">
              {quantity} QR kit{quantity === 1 ? '' : 's'}
            </p>
          </div>
          <Image
            src="/images/qrkit.png"
            alt="QR Kit"
            width={48}
            height={48}
            className="object-cover rounded-[5px] w-[48px] h-[48px]"
          />
        </div>

        <div className="flex items-center">
          {canChangeQuantity ? (
            <div className="inline-flex h-9 items-center overflow-hidden rounded-[10px] bg-[#F1F1F1]">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => updateQuantity(Math.max(1, quantity - 1))}
                disabled={
                  quantity === 1 ||
                  isPricingLoading ||
                  createOrderMutation.isPending
                }
                className="flex h-9 w-9 items-center justify-center text-black transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Minus className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <span className="flex h-9 min-w-9 items-center justify-center px-2 text-sm font-bold text-black">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() =>
                  updateQuantity(Math.min(maximumQuantity, quantity + 1))
                }
                disabled={
                  quantity >= maximumQuantity ||
                  isPricingLoading ||
                  createOrderMutation.isPending
                }
                className="flex h-9 w-9 items-center justify-center text-black transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <span className="rounded-[10px] bg-[#F1F1F1] px-4 py-2 text-sm font-bold text-black">
              Quantity: 1
            </span>
          )}
        </div>
      </div>

      {/* Pricing Section */}
      <div className="p-4 pb-5 pt-0 space-y-3">
        <div className="flex justify-between text-sm font-medium border-t border-[#F1F1F1] pt-4">
          <span className="text-[#6B7280]">QR kit</span>
          <span className="text-[#111827] font-bold">
            {priceOrPlaceholder(subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span className="text-[#6B7280]">Delivery fee</span>
          <span className="text-[#111827] font-bold">
            {priceOrPlaceholder(pricing.deliveryFee)}
          </span>
        </div>
        <div className="pt-4 border-t border-[#F1F1F1] flex justify-between items-center">
          <span className="text-[14px] font-bold text-[#111827]">Total</span>
          <span className="text-[14px] font-bold text-[#111827]">
            {priceOrPlaceholder(total)}
          </span>
        </div>
      </div>

      {/* Action Section */}
      <div className="px-4 pt-4 border-t border-[#F1F1F1] rounded-t-[12px]">
        <Button
          onClick={handlePay}
          disabled={createOrderMutation.isPending || isPricingLoading}
          className="w-full bg-[#24C166] hover:bg-[#24C166] text-white text-base font-bold mb-4 shadow-sm"
        >
          {isPricingLoading
            ? 'Loading price...'
            : isFree
              ? 'Place order'
              : `Pay ${formatNaira(total)}`}
        </Button>
        <div className="flex items-start gap-2 text-[#6B7280]">
          <p className="text-[12px] font-medium leading-tight text-center">
            ⚠️ Important: No one should collect activation fees on behalf of
            Firespot. Payment happens only inside the app.
          </p>
        </div>
      </div>
    </div>
  )
}
