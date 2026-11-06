'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, ChevronRight, X, MessageCircleHeart } from 'lucide-react'
import Link from 'next/link'
import { LoaderCircle, TagFooter } from '@/components/ui'
import { useVerifyQROrderPayment } from '@/services/qr-orders/qr-ordersHooks'

type PaymentStatus = 'loading' | 'success' | 'failed'

type ApiError = {
  response?: {
    data?: {
      message?: string
    }
  }
}

export default function OrderStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[#F4F6F8] flex items-center justify-center">
          <LoaderCircle innerBg="#F4F6F8" />
        </div>
      }
    >
      <OrderStatusContent />
    </Suspense>
  )
}

function OrderStatusContent() {
  const searchParams = useSearchParams()

  const reference = searchParams.get('reference') || ''
  const [status, setStatus] = useState<PaymentStatus>(
    reference ? 'loading' : 'failed',
  )
  const [errorMessage, setErrorMessage] = useState<string>(
    !reference ? 'We could not find that order.' : '',
  )
  const [digitalKitId, setDigitalKitId] = useState<string | null>(null)
  const [isDigital, setIsDigital] = useState(false)
  const [liteGranted, setLiteGranted] = useState(false)
  const hasVerified = useRef(false)

  const { refetch: verifyPayment } = useVerifyQROrderPayment(reference, {
    enabled: false,
  })

  // Verify payment on mount
  useEffect(() => {
    if (!reference || hasVerified.current) {
      return
    }

    hasVerified.current = true

    verifyPayment().then((result) => {
      if (result.isError) {
        setStatus('failed')
        const message =
          (result.error as ApiError)?.response?.data?.message ||
          'Payment verification failed. Please try again.'
        setErrorMessage(message)
        return
      }

      if (result.data?.paymentStatus === 'SUCCESSFUL') {
        setIsDigital(result.data.kitType === 'digital')
        setLiteGranted(result.data.liteGranted === true)
        setDigitalKitId(
          result.data.kitType === 'digital'
            ? result.data.assignedKitIds?.[0] || null
            : null,
        )
        setStatus('success')
      } else {
        setStatus('failed')
        setErrorMessage('This payment has not been completed.')
      }
    })
  }, [reference, verifyPayment])

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <div className="text-center">
          <LoaderCircle innerBg="#FFFFFF" />
          <p className="mt-4 text-[#00000066] text-sm font-medium">
            Verifying payment...
          </p>
        </div>
      </div>
    )
  }

  // Success Design
  if (status === 'success') {
    return (
      <div className="min-h-dvh bg-[#24C166] flex flex-col font-satoshi items-center">
        <div className="w-full min-h-dvh flex flex-col relative px-4">
          <div className="flex justify-end py-4 shrink-0">
            <Link href="/profile" className="text-white text-sm font-bold">
              Done
            </Link>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center mb-12">
            <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center mb-5 shrink-0">
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>

            <h1 className="text-[20px] font-bold text-white -tracking-[0.4px] mb-1.5 text-center shrink-0">
              {isDigital
                ? 'Your digital QR kit is ready'
                : 'Order submitted successfully'}
            </h1>
            <p className="text-[14px] text-center text-white max-w-[350px] mb-8 font-medium leading-[130%] shrink-0">
              {isDigital
                ? 'Your digital QR kit is ready to view and share.'
                : 'Your physical QR kit order is being processed.'}
              {liteGranted && ' Your purchase also includes Firespot Business LITE at no extra cost.'}
            </p>

            <div className="w-full border border-[#f4f6f8] bg-white shadow-[0px_4px_8px_0px_#0000000A] rounded-[12px] mt-8 shrink-0">
              <Link
                href={digitalKitId ? `/qr-kits/${digitalKitId}` : '/qr-kits'}
                className="flex items-center gap-4 border-b border-[#F1F1F1] p-3"
              >
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#FB5012] to-[#D72483] flex items-center justify-center shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M2 9V6.5C2 4.01 4.01 2 6.5 2H9M15 2h2.5C19.99 2 22 4.01 22 6.5V9M22 16v1.5c0 2.49-2.01 4.5-4.5 4.5H16M9 22H6.5C4.01 22 2 19.99 2 17.5V15M17 9.5v5c0 2-1 3-3 3h-4c-2 0-3-1-3-3v-5c0-2 1-3 3-3h4c2 0 3 1 3 3ZM19 12H5"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-black font-bold text-sm mb-1">
                    Manage QR kits
                  </h3>
                  <p className="text-[#00000080] text-[13px] font-medium">
                    {isDigital
                      ? 'View and share your digital QR kit.'
                      : 'By scanning the code or entering the kit’s serial number.'}
                  </p>
                </div>
                <ChevronRight className="text-[#00000080]" size={20} />
              </Link>

              <Link href="/profile" className="flex items-center gap-4 p-3">
                <div className="w-9 h-9 rounded-full bg-[#26B2FF] flex items-center justify-center shrink-0">
                  <MessageCircleHeart size={20} color="white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-black font-bold text-sm mb-1">
                    We value your feedback.
                  </h3>
                  <p className="text-[#00000080] text-[13px] font-medium">
                    Tell us at Firespot how we can improve our services.
                  </p>
                </div>
                <ChevronRight className="text-[#00000080]" size={20} />
              </Link>
            </div>
          </div>

          <TagFooter color="white" icon="/brand_white" />
        </div>
      </div>
    )
  }

  // Failed state
  return (
    <div className="h-dvh bg-white overflow-hidden">
      <div className="h-full flex flex-col font-satoshi">
        <header className="sticky top-0 z-50 flex items-center justify-between p-4 bg-white">
          <div className="w-8" />
          <div className="w-8" />
          <Link href="/profile">
            <X className="w-6 h-6 text-black" />
          </Link>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
          <p className="text-[64px]">😢</p>

          <h1 className="text-black text-[20px] font-bold leading-none -tracking-[0.4px] mb-2 mt-10 text-center">
            We couldn&apos;t complete your order
          </h1>
          <p className="text-[#00000066] text-sm font-medium text-center max-w-75 leading-[125%]">
            {errorMessage ||
              'Something went wrong while placing your order. Please try again.'}
          </p>
        </div>

        <div className="p-4 pb-6">
          <Link
            href={searchParams.get('kitType') === 'digital' ? '/order-qr-kit?kitType=digital' : '/order-qr-kit'}
            className="flex items-center justify-center w-full bg-black text-white font-bold h-12 rounded-full hover:bg-black"
          >
            Try again
          </Link>
        </div>
      </div>
    </div>
  )
}
