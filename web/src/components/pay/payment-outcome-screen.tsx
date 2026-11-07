'use client'

import { Button } from '@/components/ui/button'

interface PaymentOutcomeScreenProps {
  emoji: string
  emojiLabel: string
  title: string
  message: string
  actionLabel: string
  onAction: () => void
  onOkay: () => void
}

/**
 * Full-screen dead end in a payment (failed charge, expired sale): an emoji,
 * what happened, one way forward, and "Okay" to leave it.
 */
export function PaymentOutcomeScreen({
  emoji,
  emojiLabel,
  title,
  message,
  actionLabel,
  onAction,
  onOkay,
}: PaymentOutcomeScreenProps) {
  return (
    <div className="h-dvh overflow-hidden bg-white font-satoshi">
      <div className="mx-auto flex h-full max-w-125 flex-col bg-white">
        <header className="flex shrink-0 items-center justify-end px-4 py-2">
          <button
            type="button"
            onClick={onOkay}
            className="h-9 px-1 text-[16px] font-bold text-[#E2464D]"
          >
            Okay
          </button>
        </header>

        <div
          role="alert"
          className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center"
        >
          <span
            className="text-[64px] leading-none"
            role="img"
            aria-label={emojiLabel}
          >
            {emoji}
          </span>
          <h1 className="mt-6 text-[22px] font-bold leading-tight tracking-[-0.4px] text-black">
            {title}
          </h1>
          <p className="mt-2 max-w-[300px] text-[15px] font-medium leading-relaxed text-[#00000066]">
            {message}
          </p>
        </div>

        <div className="shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            onClick={onAction}
            className="h-12 w-full rounded-full text-base font-semibold"
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
