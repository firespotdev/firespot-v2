'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, ChevronRight, MessageCircleHeart, Star, X } from 'lucide-react'
import { Button, Label, Spinner, showNotificationToast } from '@/components/ui'
import {
  useSubmitFeedback,
  type FeedbackEligibility,
} from '@/services/feedback'
import { useAuthStore } from '@/services/auth'
import type { PublicSale } from '@/services/sales/interface'
import type { MerchantProfile } from '@/services/qr/interface'

interface FeedbackPromptProps {
  sale: PublicSale
  merchant: MerchantProfile
  eligibility?: FeedbackEligibility
}

function formatFeedbackDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function Avatar({
  src,
  alt,
  fallback,
  className = '',
}: {
  src?: string
  alt: string
  fallback: string
  className?: string
}) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#DCE2E8] ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={28}
          height={28}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-xs font-bold text-[#64748B]">{fallback}</span>
      )}
    </div>
  )
}

export function FeedbackPrompt({
  sale,
  merchant,
  eligibility,
}: FeedbackPromptProps) {
  const serialNumber = sale.serialNumber
  const submitFeedback = useSubmitFeedback()
  const customer = useAuthStore((state) => state.user)
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const feedbackAlreadySent =
    submitted || eligibility?.reason === 'submitted'

  if (
    (!eligibility?.eligible && !feedbackAlreadySent) ||
    !serialNumber
  ) {
    return null
  }

  const merchantName =
    sale.merchant?.businessName || merchant.businessName || 'this business'
  const experienceAt = sale.location
    ? `${merchantName}, ${sale.location}`
    : merchantName
  const customerName =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') ||
    'Firespot customer'
  const transactionDate = formatFeedbackDate(
    String(sale.recordedAt || sale.createdAt),
  )

  const handleSubmit = () => {
    if (!rating || !comment.trim() || submitFeedback.isPending) return

    submitFeedback.mutate(
      {
        saleId: sale.id,
        serialNumber,
        rating,
        comment: comment.trim(),
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: (error: unknown) =>
          showNotificationToast({
            message:
              (
                error as {
                  response?: { data?: { message?: string } }
                }
              ).response?.data?.message ||
              'Could not submit feedback. Try again.',
            mode: 'error',
          }),
      },
    )
  }

  const handleOpen = () => {
    if (feedbackAlreadySent) {
      showNotificationToast({
        message: 'Feedback already sent',
        mode: 'success',
      })
      return
    }

    setIsOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center gap-3 border-t border-[#F1F1F1] p-3 text-left transition-colors active:bg-[#F8F9FA]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#26B2FF] text-white">
          <MessageCircleHeart size={20} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold text-black">
            We value your feedback.
          </span>
          <span className="mt-0.5 block text-[13px] font-medium leading-[140%] text-[#00000080]">
            Tell us at {merchantName} how we can improve our services.
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#B8B8B8]" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80]">
          <div className="mx-auto flex h-full w-full max-w-125 flex-col bg-white">
            <header className="flex shrink-0 items-center gap-3 border-b border-[#F3F4F6] bg-white px-3 py-2.5">
              <div className="flex shrink-0 items-center">
                <Avatar
                  src={customer?.profilePhotoUrl}
                  alt={customerName}
                  fallback={customerName.charAt(0).toUpperCase()}
                />
                <Avatar
                  src={
                    sale.merchant?.profilePhotoUrl || merchant.profilePhotoUrl
                  }
                  alt={merchantName}
                  fallback={merchantName.charAt(0).toUpperCase()}
                  className="-ml-2"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[12px] font-bold text-black">
                  Feedback for {merchantName}
                </h2>
                <p className="text-[11px] font-medium text-[#64748B]">
                  {transactionDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close feedback"
                className="flex h-8 w-8 items-center justify-center"
              >
                <X size={20} className="text-black" strokeWidth={2} />
              </button>
            </header>

            <div className="flex flex-1 flex-col overflow-y-auto px-4 pt-6">
              <div className="text-center">
                <h1 className="text-[20px] font-bold -tracking-[0.4px] text-black">
                  Rate your experience
                </h1>
                <p className="mt-1 text-sm font-medium text-[#00000080]">
                  at {experienceAt}
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Feedback rating"
                className="mt-6 flex justify-center gap-2"
              >
                {Array.from({ length: 5 }, (_, index) => {
                  const value = index + 1
                  const selected = value <= rating
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={`${value} star${value === 1 ? '' : 's'}`}
                      onClick={() => setRating(value)}
                    >
                      <Star
                        className={`h-10 w-10 ${
                          selected
                            ? 'fill-[#FDB022] text-[#FDB022]'
                            : 'fill-transparent text-[#4C5563]'
                        }`}
                        strokeWidth={1}
                      />
                    </button>
                  )
                })}
              </div>

              <Label className="mt-6">Feedback</Label>
              <textarea
                id="feedback-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={500}
                placeholder="How was your experience?"
                className="min-h-40 w-full resize-none rounded-[12px] border border-[#DDDDDD] bg-white px-3.5 py-2.5 text-base font-medium text-black shadow-[0px_4px_8px_0px_#0000000A] outline-none transition-[color,box-shadow] placeholder:font-normal placeholder:text-[#9CA3AF] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={
                  !rating || !comment.trim() || submitFeedback.isPending
                }
                className="mt-6"
              >
                {submitFeedback.isPending ? <Spinner /> : 'Send feedback'}
              </Button>
            </div>

            {submitted && (
              <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="feedback-success-title"
                  className="relative w-full max-w-86 rounded-[24px] bg-white px-6 pb-9 pt-16 text-center shadow-xl"
                >
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close feedback confirmation"
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center"
                  >
                    <X className="h-6 w-6 text-black" />
                  </button>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#24C166]">
                    <Check
                      className="h-10 w-10 text-[#24C166]"
                      strokeWidth={3}
                    />
                  </div>
                  <h2
                    id="feedback-success-title"
                    className="mt-7 text-[24px] font-bold -tracking-[0.4px] text-black"
                  >
                    Feedback sent
                  </h2>
                  <p className="mt-2 text-base font-medium leading-[145%] text-[#00000080]">
                    Thank you for sharing your experience at {experienceAt}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
