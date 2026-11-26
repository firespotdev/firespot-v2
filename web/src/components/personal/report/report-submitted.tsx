'use client'

import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui'

const NEXT_STEPS = [
  {
    when: 'Now',
    what: 'Merchant notified, asked to provide proof',
    done: true,
  },
  {
    when: 'Within 24 hours',
    what: 'Firespot reviews evidence from both sides',
    done: false,
  },
  {
    when: 'Within 48 hours',
    what: 'Resolution communicated to both parties',
    done: false,
  },
]

/** Shown once a report is filed: what happens next, and where to follow it. */
export function ReportSubmitted({
  shopName,
  onTrack,
  onHome,
}: {
  shopName: string
  onTrack: () => void
  onHome: () => void
}) {
  return (
    <div className="mx-auto flex h-dvh max-w-125 flex-col overflow-hidden bg-linear-to-b from-white to-[#F4F6F8] font-satoshi">
      <div className="flex shrink-0 justify-end px-4 py-3">
        <button
          type="button"
          onClick={onHome}
          aria-label="Close"
          className="rounded-full p-2"
        >
          <X className="h-6 w-6 text-black" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto px-7 pt-8">
        <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border-[3px] border-[#24C166]">
          <Check className="h-8 w-8 text-[#24C166]" strokeWidth={3} />
        </div>
        <h1 className="mt-7 mb-2.5 text-center text-[20px] font-bold leading-none text-black">
          Dispute submitted
        </h1>
        <p className="mb-6 text-center text-[14px] font-medium leading-[140%] text-[#00000080]">
          We&apos;ve received your dispute for the order from {shopName}. Our
          team will review and respond within 48 hours.
        </p>

        <ul className="w-full space-y-3 rounded-[12px] border border-[#F1F1F1] bg-white px-2 py-3 shadow-[0px_2px_8px_0px_#0000000A]">
          {NEXT_STEPS.map((step) => (
            <li key={step.when} className="flex gap-2">
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${step.done ? 'bg-[#5FBF73]' : 'bg-[#F5C83B]'}`}
              />
              <div className="pl-1">
                <p className="text-[14px] font-medium text-black">
                  {step.when}
                </p>
                <p className="mt-0.5 text-[14px] font-medium text-[#00000080]">
                  {step.what}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto w-full shrink-0 space-y-2 px-7 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button onClick={onTrack} className="h-12">
          Track dispute
        </Button>
        <Button
          variant="ghost"
          onClick={onHome}
          className="h-12 w-full bg-transparent text-[16px] font-bold text-black"
        >
          Back to home
        </Button>
      </div>
    </div>
  )
}
