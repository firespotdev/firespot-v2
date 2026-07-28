'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { usePlanCatalog } from '@/services/merchant-plans'
import { useShopSetup } from '@/services/shop'
import { Shop } from 'iconsax-reactjs'
import { IdentificationBadgeIcon } from '@phosphor-icons/react'

/**
 * Uses the onboarding-banner slot for the merchant's most important unfinished
 * action. Verification takes precedence; once KYC is complete, shop setup uses
 * the same card until the shop is live and fully configured.
 */
export function useSetupShopCta(): {
  show: boolean
  title: string
  subtitle: string
  href: string
  needsVerification: boolean
} {
  const { data: catalog } = usePlanCatalog()
  const needsVerification = Boolean(catalog?.current?.nextStep)
  const verified = catalog?.current?.canCollect === true
  // Only fetch the checklist once we know the merchant qualifies.
  const { data: setup } = useShopSetup(verified)

  const allDone = Boolean(
    setup && setup.completedCount >= setup.total && setup.isLive,
  )

  return {
    show: needsVerification || (verified && !allDone),
    title: needsVerification ? 'Continue verification' : 'Set up Shop',
    subtitle: needsVerification
      ? 'Complete your identity verification'
      : setup?.isLive
        ? 'Finish setting up your shop'
        : 'Complete your shop setup',
    href: needsVerification ? '/verify' : '/shop-setup',
    needsVerification,
  }
}

export function SetupShopCta({ onNavigate }: { onNavigate?: () => void }) {
  const { show, title, subtitle, href, needsVerification } = useSetupShopCta()

  if (!show) return null

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="w-full flex items-center gap-3 px-3 py-2.5 border-[3px] border-[#FFFFFF99] rounded-[16px] mb-3 bg-linear-to-r from-[#FB5012] to-[#D72483] shadow-[0px_4px_8px_0px_#0000000A]"
    >
      <span className="w-9 h-9 rounded-[10px] bg-[#0000003D] flex items-center justify-center">
        {needsVerification ? (
          <IdentificationBadgeIcon size={24} weight="fill" color="white" />
        ) : (
          <Shop size={24} color="white" />
        )}
      </span>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-white text-sm font-bold">{title}</p>
        <p className="text-white/90 text-[12px] font-medium">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-white shrink-0" />
    </Link>
  )
}
