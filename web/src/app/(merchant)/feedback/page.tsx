'use client'

import { useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from '@bprogress/next/app'
import { ArrowLeft, Star } from 'lucide-react'
import { LoaderCircle } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { useMerchantFeedback } from '@/services/feedback'
import { usePlanCatalog } from '@/services/merchant-plans'

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function formatFeedbackTime(value: string) {
  const date = new Date(value)
  return `${new Intl.DateTimeFormat('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)} · ${new Intl.DateTimeFormat('en-NG', {
    month: 'short',
    day: 'numeric',
  }).format(date)}`
}

export default function FeedbackPage() {
  const router = useRouter()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { data: catalog, isLoading: planLoading } = usePlanCatalog()
  const tier = catalog?.current.effectiveTier
  const hasAccess = tier === 'PRO' || tier === 'PROMAX'
  const { data, isLoading } = useMerchantFeedback(hasAccess)

  useEffect(() => {
    if (!planLoading && catalog && !hasAccess) router.replace('/plans')
  }, [catalog, hasAccess, planLoading, router])

  const groupedFeedback = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof data>['data']>()
    for (const feedback of data?.data || []) {
      const month = formatMonth(feedback.createdAt)
      groups.set(month, [...(groups.get(month) || []), feedback])
    }
    return [...groups.entries()]
  }, [data])

  if (planLoading || (hasAccess && isLoading)) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F5F6F8]">
        <LoaderCircle innerBg="#f5f6f8" />
      </div>
    )
  }
  if (!hasAccess) return null

  const average = data?.summary.averageRating || 0
  const hasFeedback = Boolean(data?.data.length)

  return (
    <div className="min-h-dvh bg-[#F5F6F8] font-satoshi">
      <div className="mx-auto flex min-h-dvh w-full max-w-125 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <header className="flex shrink-0 items-center justify-between py-2">
          <button type="button" onClick={() => router.back()} aria-label="Back">
            <ArrowLeft size={24} className="text-black" />
          </button>
          <h1 className="text-[20px] font-bold -tracking-[0.4px] text-black">
            Feedback
          </h1>
          <div className="flex h-9 items-center justify-center gap-1 rounded-full bg-[#E5E7EB] px-3 px-2.5 text-base -tracking-[0.4px] font-bold text-black">
            {average ? average.toFixed(1) : '0'}
            <Star size={16} className="fill-[#FDB022] text-[#FDB022]" />
          </div>
        </header>

        {!hasFeedback ? (
          <div className="flex flex-1 flex-col">
            <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center px-5 pb-4 text-center">
              <span
                className="text-[64px] leading-none"
                role="img"
                aria-label="Speech bubble"
              >
                💬
              </span>
              <h2 className="mt-6 text-[20px] font-bold -tracking-[0.4px] text-black">
                No feedback yet
              </h2>
              <p className="mt-2 max-w-[250px] text-sm font-medium leading-[150%] text-[#00000080]">
                You would see your customers’ feedback here.
              </p>
            </div>

            <div className="mt-auto shrink-0 overflow-hidden rounded-[24px] bg-[#26B2FF] px-5 pt-5 text-white">
              <h3 className="text-[20px] font-bold -tracking-[0.4px]">
                Collect feedback with QR kits
              </h3>
              <p className="mt-1.5 text-sm font-medium leading-[140%] text-white/84">
                Gather valuable consumer insights from walk-in customers when
                they scan your Firespot QR kit and share feedback about your
                services.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => openDrawer({ type: 'obtain-kit' })}
                  className="h-9 rounded-full bg-[#0075FF] px-4 text-[13px] font-bold"
                >
                  Get a QR kit
                </button>
                <button
                  type="button"
                  className="h-9 rounded-full bg-white/20 px-4 text-[13px] font-bold"
                >
                  Learn more
                </button>
              </div>

              <div className="mt-6 flex items-end justify-between">
                <Image
                  src={`/icons/brand_white.svg`}
                  alt="firespot logo"
                  width={81}
                  height={24}
                  className="mb-5 shrink-0"
                />
                <Image
                  src="/images/qr_hand.png"
                  alt="Firespot QR kit"
                  width={180}
                  height={160}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-3">
            {groupedFeedback.map(([month, feedbackItems]) => (
              <section key={month} className="mb-7">
                <h2 className="mb-2 text-sm font-bold text-black">{month}</h2>
                <div className="space-y-3">
                  {feedbackItems.map((feedback) => (
                    <article
                      key={feedback._id}
                      className="rounded-[16px] bg-white p-3 shadow-[0px_4px_8px_0px_#0000000A]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E5E7EB]">
                          {feedback.customerPhotoUrl ? (
                            <Image
                              src={feedback.customerPhotoUrl}
                              alt={feedback.customerName}
                              width={36}
                              height={36}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-[#64748B]">
                              {feedback.customerName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold text-black">
                            {feedback.customerName}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            <span className="flex">
                              {Array.from({ length: 5 }, (_, index) => (
                                <Star
                                  key={index}
                                  className={`h-3.5 w-3.5 ${
                                    index < feedback.rating
                                      ? 'fill-[#FDB022] text-[#FDB022]'
                                      : 'fill-[#E5E7EB] text-[#E5E7EB]'
                                  }`}
                                />
                              ))}
                            </span>
                            <span className="text-xs font-medium text-[#64748B]">
                              {formatFeedbackTime(feedback.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-base font-medium leading-[135%] text-[#4F4F4F]">
                        {feedback.comment}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {groupedFeedback.length > 0 && (
              <p className="pb-2 text-center text-sm font-medium text-[#9CA3AF]">
                You’ve reached the end of the list
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
