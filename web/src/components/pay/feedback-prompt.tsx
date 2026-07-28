'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import {
  Button,
  Spinner,
  showNotificationToast,
} from '@/components/ui'
import {
  useFeedbackEligibility,
  useSubmitFeedback,
} from '@/services/feedback'

interface FeedbackPromptProps {
  saleId: string
  serialNumber?: string
  merchantName: string
}

export function FeedbackPrompt({
  saleId,
  serialNumber,
  merchantName,
}: FeedbackPromptProps) {
  const { data: eligibility } = useFeedbackEligibility(saleId, serialNumber)
  const submitFeedback = useSubmitFeedback()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="mt-6 w-full max-w-[390px] rounded-[16px] bg-white p-5 text-center shadow-[0px_4px_8px_0px_#0000000A]">
        <p className="text-lg font-bold text-black">Thanks for your feedback!</p>
        <p className="mt-1 text-sm font-medium text-[#00000080]">
          Your feedback has been shared with {merchantName}.
        </p>
      </div>
    )
  }

  if (!eligibility?.eligible || !serialNumber) return null

  const handleSubmit = () => {
    if (!rating || !comment.trim()) return

    submitFeedback.mutate(
      {
        saleId,
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

  return (
    <div className="mt-6 w-full max-w-[390px] rounded-[16px] bg-white p-5 text-left shadow-[0px_4px_8px_0px_#0000000A]">
      <div className="text-center">
        <h2 className="text-lg font-bold text-black">
          How was your experience?
        </h2>
        <p className="mt-1 text-sm font-medium text-[#00000080]">
          Share feedback with {merchantName}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Feedback rating"
        className="mt-4 flex justify-center gap-2"
      >
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value === 1 ? '' : 's'}`}
              onClick={() => setRating(value)}
              className="p-1"
            >
              <Star
                className={`h-8 w-8 ${
                  value <= rating
                    ? 'fill-[#FFB21A] text-[#FFB21A]'
                    : 'fill-[#E5E7EB] text-[#E5E7EB]'
                }`}
              />
            </button>
          )
        })}
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={500}
        placeholder="Tell them what you liked"
        className="mt-4 min-h-24 w-full resize-none rounded-[12px] border border-[#D8D8D8] bg-white px-4 py-3 text-sm font-medium text-black outline-none placeholder:text-[#9CA3AF]"
      />

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!rating || !comment.trim() || submitFeedback.isPending}
        className="mt-3 h-12"
      >
        {submitFeedback.isPending ? <Spinner /> : 'Submit feedback'}
      </Button>
    </div>
  )
}
