import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ReceiptBenefitStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative -mt-3 flex h-12 items-center justify-center gap-2 rounded-b-[12px] bg-linear-to-r from-[#E8AD68] via-[#EC6B69] to-[#BE7DA4] px-4 pb-3 pt-6 text-white',
        className,
      )}
    >
      <Check
        aria-hidden="true"
        size={16}
        className="shrink-0"
        strokeWidth={3}
      />
      <p className="text-center text-xs font-bold leading-5">
        You’ll get a detailed transaction receipt
      </p>
    </div>
  )
}
