'use client'

import { useRouter } from '@bprogress/next/app'
import { showNotificationToast } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import type { UserProfile } from '@/services/users'

/** Why a merchant can't turn Paystack payments on yet, if anything. */
export type PaystackBlock = 'no_plan' | 'kyc_incomplete' | 'no_bank' | 'no_payout'

export function getPaystackBlock(
  profile: UserProfile | undefined,
): PaystackBlock | null {
  if (!profile?.effectiveTier) return 'no_plan'
  if (profile.canCollect !== true) {
    return profile.collectBlockedReason === 'kyc_incomplete'
      ? 'kyc_incomplete'
      : 'no_plan'
  }
  if ((profile.bankAccounts?.length ?? 0) === 0) return 'no_bank'
  // Paystack settles into a subaccount made from the primary bank account.
  if (!profile.hasPayoutAccount) return 'no_payout'
  return null
}

/**
 * Whether Paystack payments can be turned on, and a way to explain or fix
 * it when they can't — a disabled switch alone doesn't tell the merchant why.
 */
export function usePaystackAvailability(profile: UserProfile | undefined) {
  const router = useRouter()
  const { openDrawer, closeAllDrawers } = useDrawerStore()
  const block = getPaystackBlock(profile)

  const explainBlock = () => {
    switch (block) {
      case 'no_plan':
        closeAllDrawers()
        router.push('/plans?tier=LITE')
        return
      case 'kyc_incomplete':
        closeAllDrawers()
        openDrawer({ type: 'verify-identity' })
        return
      case 'no_bank':
        closeAllDrawers()
        openDrawer({ type: 'bank-accounts', props: { showSwitch: true } })
        return
      case 'no_payout':
        showNotificationToast({
          message: 'Payout account not ready yet',
          mode: 'error',
        })
        return
      default:
        return
    }
  }

  return { block, canTurnOn: block === null, explainBlock }
}
