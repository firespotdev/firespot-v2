import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface OutstandingActionPillProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
}

/** Uppercase action capsule in the Outstanding screens' action rows. */
export function OutstandingActionPill({
  icon,
  label,
  className,
  ...props
}: OutstandingActionPillProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-9 shrink-0 items-center gap-2 rounded-full border border-[#0000000A] bg-[#F1F1F1] px-3 text-[10px] font-bold tracking-[1px] text-black shadow-[0px_2px_4px_0px_#0000000A] disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {icon}
      {label}
    </button>
  )
}
