'use client'

import { useCallback, useEffect, useState } from 'react'

export function usePaystackRedirectState() {
  const [isRedirectingToPaystack, setIsRedirectingToPaystack] = useState(false)

  useEffect(() => {
    const resetAfterBrowserRestore = () => setIsRedirectingToPaystack(false)
    window.addEventListener('pageshow', resetAfterBrowserRestore)
    return () => window.removeEventListener('pageshow', resetAfterBrowserRestore)
  }, [])

  const startPaystackRedirect = useCallback(() => {
    setIsRedirectingToPaystack(true)
  }, [])

  const cancelPaystackRedirect = useCallback(() => {
    setIsRedirectingToPaystack(false)
  }, [])

  return {
    isRedirectingToPaystack,
    startPaystackRedirect,
    cancelPaystackRedirect,
  }
}
