'use client'

import { useCallback } from 'react'
import { useSafeBack } from './use-safe-back'

/**
 * Leaves a shop setup step: back to the profile when the profile menu opened
 * it (it adds ?from=profile), otherwise back to the Shop setup checklist.
 * The URL is read on use, so pages need no Suspense boundary for it.
 */
export function useSetupStepBack() {
  const backToShopSetup = useSafeBack('/shop-setup')
  const backToProfile = useSafeBack('/profile')

  return useCallback(() => {
    const from = new URLSearchParams(window.location.search).get('from')
    if (from === 'profile') backToProfile()
    else backToShopSetup()
  }, [backToProfile, backToShopSetup])
}
