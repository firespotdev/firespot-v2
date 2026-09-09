'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check, ChevronRight, CreditCard, X } from 'lucide-react'
import { Button, TagFooter, showNotificationToast } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { useAuthStore } from '@/services/auth'
import { useSaveCardFromSale } from '@/services/sales/hooks'
import type { FeedbackEligibility } from '@/services/feedback'
import type { PublicSale } from '@/services/sales/interface'
import type { MerchantProfile } from '@/services/qr/interface'
import { formatAmount, formatConfirmationDate } from './utils'
import { FeedbackPrompt } from './feedback-prompt'
import { getBusinessImageUrl } from '@/lib/utils/business-image'
import { getCustomerFingerprint } from '@/lib/utils/customer-fingerprint'

interface SaleSuccessScreenProps {
  sale: PublicSale
  merchant: MerchantProfile
  feedbackEligibility?: FeedbackEligibility
  onClose: () => void
}

function clearSaveCardIntent() {
  const url = new URL(window.location.href)
  url.searchParams.delete('saveCard')
  window.history.replaceState(null, '', `${url.pathname}${url.search}`)
}

function PaystackSaleSuccessScreen({
  sale,
  merchant,
  feedbackEligibility,
  onClose,
  handleViewReceipt,
}: SaleSuccessScreenProps & { handleViewReceipt: () => void }) {
  const merchantName =
    sale.merchant?.businessName || merchant.businessName || 'Your vendor'
  const businessImageUrl =
    getBusinessImageUrl(sale.merchant) || getBusinessImageUrl(merchant)

  const searchParams = useSearchParams()
  const authUser = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const {
    mutate: saveCard,
    isPending: isSavingCard,
    isSuccess: isCardSaveSuccessful,
  } = useSaveCardFromSale()
  const attemptedAutomaticSave = useRef(false)

  const [cardSaved, setCardSaved] = useState(() => {
    if (!authUser?.savedCards?.length) return false
    if (sale.cardDetails?.last4) {
      return authUser.savedCards.some(
        (c) =>
          c.last4 === sale.cardDetails?.last4 &&
          c.brand === sale.cardDetails?.brand,
      )
    }
    return false
  })

  const saveCardToWallet = useCallback(() => {
    saveCard(
      {
        saleId: sale.id,
        customerFingerprint: getCustomerFingerprint(),
      },
      {
        onSuccess: (res) => {
          clearSaveCardIntent()
          setCardSaved(true)
          showNotificationToast({
            message: res.message || 'Debit card saved to your wallet!',
            mode: 'success',
          })
        },
        onError: (err: unknown) => {
          clearSaveCardIntent()
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || 'Could not save this card. Please try again.'
          showNotificationToast({
            message: msg,
            mode: 'error',
          })
        },
      },
    )
  }, [sale.id, saveCard])

  useEffect(() => {
    if (searchParams.get('saveCard') !== '1') return
    if (!sale.canSaveCard) {
      clearSaveCardIntent()
      return
    }
    if (!isAuthenticated || attemptedAutomaticSave.current) {
      return
    }

    attemptedAutomaticSave.current = true
    if (cardSaved) {
      clearSaveCardIntent()
      return
    }
    saveCardToWallet()
  }, [
    cardSaved,
    isAuthenticated,
    sale.canSaveCard,
    saveCardToWallet,
    searchParams,
  ])

  const handleSaveCard = () => {
    if (cardSaved || isCardSaveSuccessful) {
      showNotificationToast({
        message: 'This debit card is already saved to your wallet.',
        mode: 'success',
      })
      return
    }

    if (!isAuthenticated) {
      showNotificationToast({
        message: 'Sign in to save this card for 1-tap checkout.',
        mode: 'info',
      })
      if (typeof window !== 'undefined') {
        const returnUrl = new URL(window.location.href)
        returnUrl.searchParams.set('saveCard', '1')
        window.location.href = `/login?redirect=${encodeURIComponent(returnUrl.pathname + returnUrl.search)}`
      }
      return
    }

    saveCardToWallet()
  }

  return (
    <div className="h-dvh bg-[#24C166] overflow-hidden font-satoshi">
      <div className="max-w-125 mx-auto h-full flex flex-col justify-between px-4 pb-4 pt-3 relative">
        {/* Top Header */}
        <header className="flex items-center justify-end py-1 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center text-white cursor-pointer active:opacity-75 transition-opacity"
          >
            <X size={24} strokeWidth={2.4} />
          </button>
        </header>

        {/* Hero & Content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-1 overflow-y-auto">
          {/* White circled checkmark */}
          <div className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center mb-5 shrink-0">
            <Check className="w-9 h-9 text-white" strokeWidth={3.5} />
          </div>

          <h1 className="text-white text-[22px] font-bold -tracking-[0.4px] mb-1.5 leading-tight">
            Payment successful
          </h1>
          <p className="text-white text-[15px] font-normal leading-[135%] mb-6 max-w-[320px]">
            NGN {formatAmount(sale.amount)} has been sent to {merchantName}.
          </p>

          {/* Receipt button */}
          <button
            type="button"
            onClick={handleViewReceipt}
            className="bg-[#1EA759] hover:bg-[#1A9650] text-white px-4 py-2 rounded-full flex items-center gap-1.5 font-bold text-[10px] tracking-[1px] shadow-sm transition-colors mb-7 cursor-pointer"
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
              />
              <path
                d="M2 7v14c0 .83.94 1.3 1.6.8l1.71-1.28c.4-.3.96-.26 1.32.1l1.66 1.67c.39.39 1.03.39 1.42 0l1.68-1.68c.35-.35.91-.39 1.3-.09l1.71 1.28c.66.49 1.6.02 1.6-.8V4c0-1.1.9-2 2-2H6C3 2 2 3.79 2 6v1Z"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 9h6M6.75 13h4.5"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            RECEIPT
          </button>

          {/* Cards Section */}
          <div className="w-full space-y-3">
            {/* Card 1: Save debit card for faster checkout (shown on card payments) */}
            {sale.canSaveCard && (
              <button
                type="button"
                onClick={handleSaveCard}
                disabled={isSavingCard}
                className="w-full text-left bg-white rounded-[14px] p-3 shadow-[0px_4px_8px_0px_#0000000A] flex items-center gap-3 transition-colors active:bg-[#FAFAFA] cursor-pointer"
              >
                <div className="w-10 h-10 rounded-[10px] bg-[#E83C52] flex items-center justify-center text-white shadow-sm shrink-0">
                  <CreditCard size={20} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-black leading-tight">
                    {cardSaved || isCardSaveSuccessful
                      ? 'Debit card saved for faster checkout'
                      : 'Save debit card for faster checkout'}
                  </p>
                  <p className="text-xs text-[#64748B] font-medium leading-[130%] mt-0.5">
                    {cardSaved || isCardSaveSuccessful
                      ? 'Your card is saved for faster one-tap payments on your next visit.'
                      : 'Complete payments faster when you add a local or international debit card.'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#868788] shrink-0" />
              </button>
            )}

            {/* Card 2: Merchant Profile & Feedback */}
            <div className="w-full bg-white rounded-[14px] shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden text-left">
              <Link
                href={`/shop/${merchant.merchantSlug || sale.serialNumber}`}
                className="flex items-center gap-3 p-3 transition-colors active:bg-[#FAFAFA]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#F1F1F1] bg-[#E9EDF1]">
                  {businessImageUrl ? (
                    <Image
                      src={businessImageUrl}
                      alt={merchantName}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src="/icons/store_solid.svg"
                      alt={merchantName}
                      width={22}
                      height={22}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-black leading-tight">
                    {merchantName}
                  </p>
                  <p className="mt-0.5 text-[13px] font-medium text-[#00000080]">
                    View business profile
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#868788]" />
              </Link>

              <FeedbackPrompt
                sale={sale}
                merchant={merchant}
                eligibility={feedbackEligibility}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 py-2">
          <TagFooter icon="brand_white" color="#FFFFFF" />
        </div>
      </div>
    </div>
  )
}

function ManualTransferSaleSuccessScreen({
  sale,
  merchant,
  feedbackEligibility,
  onClose,
  handleViewReceipt,
}: SaleSuccessScreenProps & { handleViewReceipt: () => void }) {
  const merchantName =
    sale.merchant?.businessName || merchant.businessName || 'Your vendor'
  const businessImageUrl =
    getBusinessImageUrl(sale.merchant) || getBusinessImageUrl(merchant)
  const confirmedAt = formatConfirmationDate(sale.recordedAt || sale.createdAt)

  return (
    <div className="h-dvh bg-white overflow-hidden font-satoshi">
      <div className="max-w-125 mx-auto h-full flex flex-col bg-[#f4f6f8]">
        {/* Header */}
        <header className="flex items-center justify-end px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 bg-[#00000014] rounded-[12px] flex items-center justify-center cursor-pointer"
          >
            <X size={16} color="#868788" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full border-4 border-[#24C166] flex items-center justify-center shrink-0">
            <Check className="w-8 h-8 text-[#24C166]" strokeWidth={3} />
          </div>

          <h1 className="font-bold text-[20px] text-black -tracking-[0.4px] leading-[110%] mt-6 max-w-75">
            {merchantName} has received your payment.
          </h1>
          <p className="text-sm text-[#00000080] font-medium mt-3 max-w-85">
            Payment of NGN {formatAmount(sale.amount)} confirmed
            {confirmedAt ? ` on ${confirmedAt}.` : '.'}
          </p>

          <Button
            variant="secondary"
            onClick={handleViewReceipt}
            className="bg-[#0000000A] py-2.5 w-fit px-4 h-9 gap-1 shadow-[0px_2px_4px_0px_#0000000A] border border-[#0000000A] shrink-0 mt-6"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M22 6v2.42C22 10 21 11 19.42 11H16V4.01C16 2.9 16.91 2 18.02 2c1.09.01 2.09.45 2.81 1.17C21.55 3.9 22 4.9 22 6Z"
                stroke="#000000"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
              <path
                d="M2 7v14c0 .83.94 1.3 1.6.8l1.71-1.28c.4-.3.96-.26 1.32.1l1.66 1.67c.39.39 1.03.39 1.42 0l1.68-1.68c.35-.35.91-.39 1.3-.09l1.71 1.28c.66.49 1.6.02 1.6-.8V4c0-1.1.9-2 2-2H6C3 2 2 3.79 2 6v1Z"
                stroke="#000000"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
              <path
                d="M6.25 10h5.5"
                stroke="#000000"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
            <span className="text-black text-[10px] font-bold tracking-[1px]">
              DETAILS
            </span>
          </Button>

          <div className="mt-6 w-full max-w-[390px] overflow-hidden rounded-[12px] border border-[#F1F1F1] bg-white text-left shadow-[0px_4px_8px_0px_#0000000A]">
            <div className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#F1F1F1] bg-[#E9EDF1]">
                {businessImageUrl ? (
                  <Image
                    src={businessImageUrl}
                    alt={merchantName}
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image
                    src="/icons/store_solid.svg"
                    alt={merchantName}
                    width={22}
                    height={22}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-black">
                  {merchantName}
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-[#00000080]">
                  View business profile
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#B8B8B8]" />
            </div>

            <FeedbackPrompt
              sale={sale}
              merchant={merchant}
              eligibility={feedbackEligibility}
            />
          </div>
        </div>

        <div className="shrink-0 py-5">
          <TagFooter />
        </div>
      </div>
    </div>
  )
}

export function SaleSuccessScreen({
  sale,
  merchant,
  feedbackEligibility,
  onClose,
}: SaleSuccessScreenProps) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const handleViewReceipt = () => {
    openDrawer({ type: 'sale-receipt', props: { sale, merchant } })
  }

  if (sale.paymentRail === 'paystack') {
    return (
      <PaystackSaleSuccessScreen
        sale={sale}
        merchant={merchant}
        feedbackEligibility={feedbackEligibility}
        onClose={onClose}
        handleViewReceipt={handleViewReceipt}
      />
    )
  }

  return (
    <ManualTransferSaleSuccessScreen
      sale={sale}
      merchant={merchant}
      feedbackEligibility={feedbackEligibility}
      onClose={onClose}
      handleViewReceipt={handleViewReceipt}
    />
  )
}
