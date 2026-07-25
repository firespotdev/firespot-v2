import Image from 'next/image'
import type { PlanTier } from '@/services/merchant-plans'
import { cn } from '@/lib/utils'

/**
 * Per-tier icon. LITE and PRO sit in a white rounded container; PRO MAX uses
 * a self-contained gradient asset and needs no container.
 */
const TIER_ICON: Record<PlanTier, { src: string; boxed: boolean }> = {
  LITE: { src: '/images/firespot_alt.png', boxed: true },
  PRO: { src: '/images/firespot_personal.png', boxed: true },
  PROMAX: { src: '/images/firespot_logo.png', boxed: false },
}

interface TierIconProps {
  tier: PlanTier
  /** Outer box size in px (icon scales to ~55% inside a box, full when unboxed) */
  size?: number
  className?: string
}

export function TierIcon({ tier, size = 40, className }: TierIconProps) {
  const { src, boxed } = TIER_ICON[tier]
  const inner = boxed ? Math.round(size * 0.55) : size

  const img = (
    <Image
      src={src}
      alt={`Firespot ${tier}`}
      width={inner}
      height={inner}
      className={boxed ? undefined : 'rounded-[12px]'}
    />
  )

  if (!boxed) {
    return (
      <span
        className={cn('inline-flex shrink-0', className)}
        style={{ width: size, height: size }}
      >
        {img}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center shrink-0 rounded-[12px] bg-white border-[1.11px] border-[#F1F1F1] shadow-[0px_4.44px_8.89px_0px_#0000000A]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {img}
    </span>
  )
}
