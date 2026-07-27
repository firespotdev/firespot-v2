'use client'

import { ArrowLeft } from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ShopSetupScreenProps {
  eyebrow: string
  title: string
  children: React.ReactNode
  onBack: () => void
  onContinue: () => void
  continueLabel?: string
  disabled?: boolean
  pending?: boolean
  className?: string
  contentClassName?: string
}

export function ShopSetupScreen({
  eyebrow,
  title,
  children,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  disabled = false,
  pending = false,
  className,
  contentClassName,
}: ShopSetupScreenProps) {
  return (
    <div className={cn('min-h-dvh bg-[#F5F6F8] font-satoshi', className)}>
      <div className="mx-auto flex min-h-dvh w-full max-w-125 flex-col">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex w-14 items-center justify-center py-3.5"
        >
          <ArrowLeft className="h-6 w-6 text-black" />
        </button>

        <main className={cn('flex-1 px-4 pb-8', contentClassName)}>
          <p className="mt-0.5 text-sm font-medium text-[#00000080]">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-[20px] font-bold leading-[120%] -tracking-[0.4px] text-black">
            {title}
          </h1>
          {children}
        </main>

        <footer className="sticky bottom-0 z-10 w-full rounded-t-[12px] border-t border-[#F1F1F1] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            onClick={onContinue}
            disabled={disabled || pending}
            className="h-14 w-full font-bold"
          >
            {pending ? <Spinner /> : continueLabel}
          </Button>
        </footer>
      </div>
    </div>
  )
}
