'use client'

import { ChevronDown } from 'lucide-react'
import { GreenSpinner } from '@/components/ui'

interface PaystackWaitingScreenProps {
  onMinimize: () => void
}

export function PaystackWaitingScreen({
  onMinimize,
}: PaystackWaitingScreenProps) {
  return (
    <div className="h-dvh overflow-hidden">
      <div className="mx-auto flex h-full max-w-125 flex-col bg-[#f4f6f8]">
        <header className="flex shrink-0 items-center px-4 py-3">
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize payment"
            className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#00000014]"
          >
            <ChevronDown size={18} color="#868788" />
          </button>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <GreenSpinner size={16} innerBg="#f4f6f8" />
          <h1 className="mt-6 text-[20px] font-bold tracking-[-0.4px] text-black">
            Confirming your payment...
          </h1>
          <p className="mt-2 max-w-85 text-sm font-medium text-[#6B7280]">
            Paystack will confirm receipt automatically. You do not need to
            upload a receipt or ask the vendor to approve it.
          </p>
        </div>
      </div>
    </div>
  )
}
