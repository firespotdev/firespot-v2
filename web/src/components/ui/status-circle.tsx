import { Check, LoaderCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusCircleState = 'passed' | 'failed' | 'loading' | 'empty'

interface StatusCircleProps {
  state: StatusCircleState
  /** Diameter in px. */
  size?: number
  className?: string
}

/**
 * The trailing status indicator on a checklist row: a green tick when done, a
 * red cross when failed, an empty ring otherwise. Shared by the verification
 * step list and the shop-setup checklist.
 */
export function StatusCircle({
  state,
  size = 20,
  className,
}: StatusCircleProps) {
  const box = { width: size, height: size }
  const icon = Math.round(size * 0.7)

  if (state === 'passed') {
    return (
      <span
        className={cn(
          'rounded-full bg-[#24C166] flex items-center justify-center shrink-0',
          className,
        )}
        style={box}
      >
        <Check style={{ width: icon, height: icon }} className="text-white stroke-[3px]" />
      </span>
    )
  }

  if (state === 'failed') {
    return (
      <span
        className={cn(
          'rounded-full bg-[#FF002E] flex items-center justify-center shrink-0',
          className,
        )}
        style={box}
      >
        <X style={{ width: icon, height: icon }} className="text-white stroke-[3px]" />
      </span>
    )
  }

  if (state === 'loading') {
    return (
      <span
        className={cn(
          'rounded-full border border-[#DFDFDF] flex items-center justify-center shrink-0',
          className,
        )}
        style={box}
        aria-label="Verification in progress"
      >
        <LoaderCircle
          className="animate-spin text-[#0075FF]"
          style={{ width: icon, height: icon }}
        />
      </span>
    )
  }

  return (
    <span
      className={cn('rounded-full border border-[#DFDFDF] shrink-0', className)}
      style={box}
      aria-hidden
    />
  )
}
