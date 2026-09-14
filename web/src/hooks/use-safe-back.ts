'use client'

import { useCallback } from 'react'
import { useRouter } from '@bprogress/next/app'

/**
 * Returns through same-origin browser history when it is safe to do so.
 * Direct visits, bookmarks, and external referrers use the supplied in-app
 * fallback instead of sending the user out of Firespot.
 */
export function useSafeBack(fallbackHref: string) {
  const router = useRouter()

  return useCallback(() => {
    if (typeof window === 'undefined') {
      router.replace(fallbackHref)
      return
    }

    let hasSameOriginReferrer = false
    if (document.referrer) {
      try {
        hasSameOriginReferrer =
          new URL(document.referrer).origin === window.location.origin
      } catch {
        hasSameOriginReferrer = false
      }
    }

    if (hasSameOriginReferrer && window.history.length > 1) {
      router.back()
      return
    }

    router.replace(fallbackHref)
  }, [fallbackHref, router])
}
