'use client'

import { GreenSpinner } from '@/components/ui'

export function PaystackRedirectingScreen() {
  return (
    <div
      className="fixed inset-0 z-[1000] flex min-h-dvh items-center justify-center bg-[#F4F6F8] px-4 font-satoshi"
      role="status"
      aria-live="polite"
      aria-label="Redirecting to Paystack"
    >
      <div className="flex max-w-85 flex-col items-center text-center">
        <GreenSpinner size={16} innerBg="#F4F6F8" />
        <h1 className="mt-6 text-[20px] font-bold tracking-[-0.4px] text-black">
          Redirecting to Paystack...
        </h1>
        <p className="mt-2 text-sm font-medium text-[#6B7280]">
          Please wait while we securely send you to Paystack. Do not close or
          refresh this page.
        </p>
      </div>
    </div>
  )
}
