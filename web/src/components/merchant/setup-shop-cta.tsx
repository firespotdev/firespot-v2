'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { usePlanCatalog } from '@/services/merchant-plans'
import { useShopSetup } from '@/services/shop'
import { Shop } from 'iconsax-reactjs'

/**
 * Shows once the merchant has verified a plan — gated on `canCollect` (plan
 * present + KYC complete), which keeps it visible through a lapse, when the
 * merchant still has a shop to manage. Hidden once the shop is live and fully
 * set up.
 */
export function useSetupShopCta(): { show: boolean; subtitle: string } {
  const { data: catalog } = usePlanCatalog()
  const verified = catalog?.current?.canCollect === true
  // Only fetch the checklist once we know the merchant qualifies.
  const { data: setup } = useShopSetup(verified)

  const allDone = Boolean(
    setup && setup.completedCount >= setup.total && setup.isLive,
  )

  return {
    show: verified && !allDone,
    subtitle: setup?.isLive
      ? 'Finish setting up your shop'
      : 'Complete your shop setup',
  }
}

export function SetupShopCta() {
  const { show, subtitle } = useSetupShopCta()

  if (!show) return null

  return (
    <Link
      href="/shop-setup"
      className="w-full flex items-center gap-3 px-3 py-2.5 border-[3px] border-[#FFFFFF99] rounded-[16px] mb-3 bg-linear-to-r from-[#FB5012] to-[#D72483] shadow-[0px_4px_8px_0px_#0000000A]"
    >
      <span className="w-9 h-9 rounded-[10px] bg-[#0000003D] flex items-center justify-center">
        <Shop size={24} color="white" />
      </span>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-white text-sm font-bold">Set up Shop</p>
        <p className="text-white/90 text-[12px] font-medium">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-white shrink-0" />
    </Link>
  )
}
