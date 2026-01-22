'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, ChevronRight, LinkIcon, MessageCircleHeart } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { LoaderCircle, TagFooter } from '@/components/ui'
import { useAuthStore } from '@/services/auth'
import { useVerifyPayment, useUserProfile } from '@/services/users'
import { useDrawerStore } from '@/services/drawer'

type PaymentStatus = 'loading' | 'success' | 'failed'

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center">
          <LoaderCircle innerBg="#F4F6F8" />
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  )
}

function PaymentStatusContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const reference = searchParams.get('reference') || ''
  const [status, setStatus] = useState<PaymentStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [hasVerified, setHasVerified] = useState(false)

  const verifyPayment = useVerifyPayment()
  const { data: profile } = useUserProfile()
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const handleOpenReceipt = () => {
    openDrawer({
      type: 'receipt',
      props: {
        amount: 500,
        paidBy: profile?.businessName || 'Customer',
        paidTo: profile?.businessName || 'Merchant',
        referenceNumber: reference,
        description: 'QR Kit Activation',
      },
    })
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // Verify payment on mount
  useEffect(() => {
    if (!reference || hasVerified || !isAuthenticated) return

    setHasVerified(true)
    verifyPayment.mutate(reference, {
      onSuccess: () => {
        setStatus('success')
      },
      onError: (error: any) => {
        setStatus('failed')
        const message =
          error?.response?.data?.message ||
          'Payment verification failed. Please try again.'
        setErrorMessage(message)
      },
    })
  }, [reference, hasVerified, isAuthenticated, verifyPayment])

  if (!isAuthenticated) {
    return null
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center">
        <div className="text-center">
          <LoaderCircle innerBg="#F4F6F8" />
          <p className="mt-4 text-gray-600 font-medium">Verifying payment...</p>
        </div>
      </div>
    )
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen">
        <div className="max-w-[500px] bg-[#24C166] mx-auto min-h-screen flex flex-col font-satoshi">
          <header className="flex items-center justify-between py-4 px-4">
            <div className="w-10" />
            <div className="w-10" />
            <Link href="/profile" className="text-white font-bold text-sm">
              Done
            </Link>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="w-16 h-16 border-4 border-white rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8"
                fill="#24C166"
                viewBox="0 0 24 24"
                stroke="white"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-white text-xl font-bold mb-1 leading-none">
              Activated successfully
            </h1>
            <p className="text-[#FFFFFFE5] text-sm text-center font-medium max-w-[280px] mb-6">
              You can now start using this Firespot QR kit to share your bank
              account details.
            </p>

            <button
              type="button"
              onClick={handleOpenReceipt}
              className="bg-[#33A061] w-fit flex items-center justify-center gap-1 text-white hover:bg-[#33A061]/90 rounded-full px-3.5 py-2.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M22 6v2.42C22 10 21 11 19.42 11H16V4.01C16 2.9 16.91 2 18.02 2c1.09.01 2.09.45 2.81 1.17C21.55 3.9 22 4.9 22 6Z"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M2 7v14c0 .83.94 1.3 1.6.8l1.71-1.28c.4-.3.96-.26 1.32.1l1.66 1.67c.39.39 1.03.39 1.42 0l1.68-1.68c.35-.35.91-.39 1.3-.09l1.71 1.28c.66.49 1.6.02 1.6-.8V4c0-1.1.9-2 2-2H6C3 2 2 3.79 2 6v1Z"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M6 9h6M6.75 13h4.5"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
              <span className="text-[10px] tracking-[1px] font-bold">
                RECEIPT
              </span>
            </button>
          </div>

          <div className="p-4 pb-8 space-y-3">
            <button
              type="button"
              className="w-full bg-white rounded-[12px] p-3 flex items-center gap-3 shadow-[0px_4px_8px_0px_#0000000A]"
            >
              <Image
                src="/icons/firespot_logo.svg"
                alt="Firespot"
                width={36}
                height={36}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-black">
                  Upgrade to a business profile
                </p>
                <p className="text-[13px] text-[#00000080] font-medium">
                  Re-engage customers, get feedback, receive instant payment
                  notifications.
                </p>
              </div>
              <ChevronRight
                strokeWidth={2}
                className="w-4 h-4 text-[#BDBDBD]"
              />
            </button>

            <div className="w-full bg-white rounded-[12px] py-3 shadow-[0px_4px_8px_0px_#0000000A]">
              <Link
                href="/activate"
                className="w-full flex items-center gap-3 border-b border-[#F4F6F8] pb-3 px-3"
              >
                <div className="w-9 h-9 bg-[#0075FF] rounded-full flex items-center justify-center">
                  <LinkIcon size={20} strokeWidth={2} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-black">
                    Link another QR kit
                  </p>
                  <p className="text-[13px] text-[#00000080] font-medium">
                    By scanning the code or entering the kit&apos;s serial
                    number.
                  </p>
                </div>
                <ChevronRight
                  strokeWidth={2}
                  className="w-4 h-4 text-[#BDBDBD]"
                />
              </Link>

              <button
                type="button"
                className="w-full flex items-center gap-3 pt-3 px-3"
              >
                <div className="w-9 h-9 bg-[#26B2FF] rounded-full flex items-center justify-center">
                  <MessageCircleHeart
                    size={20}
                    strokeWidth={2}
                    className="text-white"
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-black">
                    We value your feedback
                  </p>
                  <p className="text-[13px] text-[#00000080] font-medium">
                    Tell us at Firespot how we can improve our services.
                  </p>
                </div>
                <ChevronRight
                  strokeWidth={2}
                  className="w-4 h-4 text-[#BDBDBD]"
                />
              </button>
            </div>

            <TagFooter icon="brand_white" color="#EBEBEB" />
          </div>
        </div>
      </div>
    )
  }

  // Failed state
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[500px] mx-auto min-h-screen flex flex-col font-satoshi">
        <header className="flex items-center justify-between p-4">
          <div className="w-8" />
          <div className="w-8" />
          <Link href="/profile">
            <X className="w-6 h-6 text-black" />
          </Link>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path
              d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2Zm-.75 6c0-.41.34-.75.75-.75s.75.34.75.75v5c0 .41-.34.75-.75.75s-.75-.34-.75-.75V8Zm1.67 8.38c-.05.13-.12.23-.21.33-.1.09-.21.16-.33.21-.12.05-.25.08-.38.08s-.26-.03-.38-.08-.23-.12-.33-.21c-.09-.1-.16-.2-.21-.33A.995.995 0 0 1 11 16c0-.13.03-.26.08-.38s.12-.23.21-.33c.1-.09.21-.16.33-.21a1 1 0 0 1 .76 0c.12.05.23.12.33.21.09.1.16.21.21.33.05.12.08.25.08.38s-.03.26-.08.38Z"
              fill="#ff0000"
            ></path>
          </svg>

          <h1 className="text-black text-xl font-bold leading-none -tracking-[0.4px] mb-2 mt-4">
            Payment didn&apos;t go through
          </h1>
          <p className="text-[#00000066] text-sm font-medium text-center max-w-[300px]">
            {errorMessage ||
              "The card couldn't be charged due to insufficient balance."}
          </p>
        </div>

        <div className="p-4 pb-8">
          <Button
            onClick={() => router.push('/activate')}
            className="w-full bg-black text-white font-bold"
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
