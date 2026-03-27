'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronDown, Trash2, Minus, Plus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'
import { useCreateQROrder } from '@/services/qr-orders/qr-ordersHooks'
import { useQRAvailability } from '@/services/qr/qrApi'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showNotificationToast, LoaderCircle } from '@/components/ui'

interface CheckoutDrawerProps {
  initialQuantity: number
  phoneNumber: string
  state: string
  address: string
  clearForm: () => void
}

export const CheckoutDrawer = ({
  initialQuantity,
  phoneNumber,
  state,
  address,
  clearForm,
}: CheckoutDrawerProps) => {
  const { closeDrawer } = useDrawerStore()
  const router = useRouter()
  const createOrderMutation = useCreateQROrder()
  const { data: availability } = useQRAvailability()
  const [quantity, setQuantity] = useState(initialQuantity)

  const pricePerKit = 2500
  const deliveryFee = 3000
  const subtotal = quantity * pricePerKit
  const total = subtotal + deliveryFee

  const availableCount = availability?.availableCount ?? 0
  const isOutOfStock = availableCount < quantity

  const handleIncrement = () => setQuantity((q) => q + 1)
  const handleDecrement = () => setQuantity((q) => (q > 1 ? q - 1 : 1))
  const handleRemove = () => {
    clearForm()
    closeDrawer()
  }

  const handleClear = () => {
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
        quantity,
        phoneNumber,
        state,
        deliveryAddress: address,
      },
      {
        onSuccess: (data) => {
          if (data?.authorizationUrl) {
            // Redirect to Paystack
            window.location.href = data.authorizationUrl
          } else {
            showNotificationToast({
              message: 'Error initializing payment',
              duration: 3000,
            })
          }
        },
        onError: (error: any) => {
          showNotificationToast({
            message: error?.response?.data?.message || 'Failed to create order',
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
        {isOutOfStock ? (
          <Link href="/profile" onClick={closeDrawer}>
            <ChevronDown color="black" strokeWidth={2.5} />
          </Link>
        ) : (
          <ChevronDown color="black" strokeWidth={2.5} onClick={closeDrawer} />
        )}
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
        {isOutOfStock ? (
          <Link
            href="/profile"
            onClick={handleClear}
            className="text-xs font-medium text-black underline underline-offset-3"
          >
            Clear
          </Link>
        ) : (
          <button
            onClick={handleClear}
            className="text-xs font-medium text-black underline underline-offset-3"
          >
            Clear
          </button>
        )}
      </div>

      {/* Item Section */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <h3 className="text-[14px] font-medium text-[#111827]">
              Firespot QR kit
            </h3>
            <p className="text-[14px] text-[#9CA3AF] font-medium">
              1 QR stand, 1 sticker
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

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRemove}
              className="w-9 h-9 rounded-[10px] bg-[#F1F1F1] flex items-center justify-center text-black"
            >
              <Trash2 size={16} />
            </button>
            <div className="flex items-center bg-[#F1F1F1] rounded-[10px] px-2 h-9 min-w-[100px] justify-between">
              <button
                onClick={handleDecrement}
                className="w-6 h-6 flex items-center justify-center text-black"
              >
                <Minus size={16} />
              </button>
              <span className="font-bold text-[14px]">{quantity}</span>
              <button
                onClick={handleIncrement}
                className="w-6 h-6 flex items-center justify-center text-black"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div className="text-[14px] font-bold text-[#111827]">
            NGN {subtotal.toLocaleString()}.00
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="p-4 pb-5 pt-0 space-y-3">
        <div className="flex justify-between text-sm font-medium border-t border-[#F1F1F1] pt-4">
          <span className="text-[#6B7280]">Subtotal</span>
          <span className="text-[#111827] font-bold">
            NGN {subtotal.toLocaleString()}.00
          </span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span className="text-[#6B7280]">Delivery fee</span>
          <span className="text-[#111827] font-bold">
            NGN {deliveryFee.toLocaleString()}.00
          </span>
        </div>
        <div className="pt-4 border-t border-[#F1F1F1] flex justify-between items-center">
          <span className="text-[14px] font-bold text-[#111827]">Total</span>
          <span className="text-[14px] font-bold text-[#111827]">
            NGN {total.toLocaleString()}.00
          </span>
        </div>
      </div>

      {/* Action Section */}
      <div className="px-4 pt-4 border-t border-[#F1F1F1] rounded-t-[12px]">
        <Button
          onClick={handlePay}
          disabled={createOrderMutation.isPending || isOutOfStock}
          className={`w-full ${
            isOutOfStock
              ? 'bg-gray-400 hover:bg-gray-400'
              : 'bg-[#24C166] hover:bg-[#24C166]'
          } text-white text-base font-bold mb-4 shadow-sm`}
        >
          {isOutOfStock ? 'OUT OF STOCK' : `Pay NGN ${total.toLocaleString()}`}
        </Button>
        <div className="flex items-start gap-2 text-[#6B7280]">
          <AlertCircle size={16} className="text-[#FBBF24] shrink-0 mt-0.5" />
          <p className="text-[13px] font-medium leading-tight">
            Important: No one should collect activation fees on behalf of
            Firespot. Payment happens only inside the app.
          </p>
        </div>
      </div>
    </div>
  )
}
