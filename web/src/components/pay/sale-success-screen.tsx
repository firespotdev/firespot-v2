'use client'

import Image from 'next/image'
import { Check, ChevronRight, X } from 'lucide-react'
import { Button, TagFooter } from '@/components/ui'
import { LoadingPage } from '@/components/layout/LoadingPage'
import { useDrawerStore } from '@/services/drawer'
import { useFeedbackEligibility } from '@/services/feedback'
import type { PublicSale } from '@/services/sales/interface'
import type { MerchantProfile } from '@/services/qr/interface'
import { formatAmount, formatConfirmationDate } from './utils'
import { FeedbackPrompt } from './feedback-prompt'

interface SaleSuccessScreenProps {
  sale: PublicSale
  merchant: MerchantProfile
  onClose: () => void
}

export function SaleSuccessScreen({
  sale,
  merchant,
  onClose,
}: SaleSuccessScreenProps) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { data: feedbackEligibility, isLoading: isFeedbackLoading } =
    useFeedbackEligibility(sale.id, sale.serialNumber)

  const merchantName =
    sale.merchant?.businessName || merchant.businessName || 'Your vendor'
  const confirmedAt = formatConfirmationDate(sale.recordedAt || sale.createdAt)

  const handleViewReceipt = () => {
    openDrawer({ type: 'sale-receipt', props: { sale, merchant } })
  }

  if (isFeedbackLoading) {
    return <LoadingPage innerBg="#F4F6F8" />
  }

  return (
    <div className="h-dvh bg-white overflow-hidden">
      <div className="max-w-125 mx-auto h-full flex flex-col bg-[#f4f6f8]">
        {/* Header */}
        <header className="flex items-center justify-end px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 bg-[#00000014] rounded-[12px] flex items-center justify-center"
          >
            <X size={16} color="#868788" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full border-4 border-[#24C166] flex items-center justify-center shrink-0">
            <Check className="w-8 h-8 text-[#24C166]" strokeWidth={3} />
          </div>

          <h1 className="font-bold text-[20px] text-black -tracking-[0.4px] leading-[110%] mt-6 max-w-75">
            {merchantName} has been notified about your payment.
          </h1>
          <p className="text-sm text-[#00000080] font-medium mt-3 max-w-85">
            Transfer of NGN{formatAmount(sale.amount)} confirmed
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
              RECEIPT
            </span>
          </Button>

          <div className="mt-6 w-full max-w-[390px] overflow-hidden rounded-[12px] border border-[#F1F1F1] bg-white text-left shadow-[0px_4px_8px_0px_#0000000A]">
            <div className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#F1F1F1] bg-[#E9EDF1]">
                {sale.merchant?.profilePhotoUrl || merchant.profilePhotoUrl ? (
                  <Image
                    src={
                      sale.merchant?.profilePhotoUrl ||
                      merchant.profilePhotoUrl!
                    }
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
