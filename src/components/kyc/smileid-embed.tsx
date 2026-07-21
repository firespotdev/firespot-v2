'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KycSessionResponse } from '@/services/kyc'

const SMILEID_SCRIPT_SRC =
  'https://cdn.smileidentity.com/inline/v1/js/script.min.js'

declare global {
  interface Window {
    SmileIdentity?: (config: Record<string, unknown>) => void
  }
}

let scriptPromise: Promise<void> | null = null

/** Loads the hosted SmileID web script once and caches the promise. */
function loadSmileIdScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.SmileIdentity) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SMILEID_SCRIPT_SRC}"]`,
    )
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load SmileID')),
      )
      return
    }

    const script = document.createElement('script')
    script.src = SMILEID_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load SmileID'))
    document.body.appendChild(script)
  })

  return scriptPromise
}

interface SmileIdEmbedProps {
  session: KycSessionResponse
  onSuccess: () => void
  onClose: () => void
  onError: (message: string) => void
}

/**
 * Launches SmileID's hosted web flow for the checks that must run client-side
 * (BVN consent screen, selfie/liveness capture). Results are delivered to the
 * backend via SmileID's callback; this component only reports completion so
 * the caller can start polling /kyc/status.
 */
export function SmileIdEmbed({
  session,
  onSuccess,
  onClose,
  onError,
}: SmileIdEmbedProps) {
  const [loading, setLoading] = useState(true)
  const launched = useRef(false)

  const launch = useCallback(async () => {
    if (launched.current) return
    launched.current = true

    try {
      await loadSmileIdScript()
      if (!window.SmileIdentity) {
        throw new Error('SmileID unavailable')
      }

      setLoading(false)
      window.SmileIdentity({
        token: session.token,
        product: session.product,
        callback_url: session.callbackUrl,
        environment: session.environment,
        partner_details: {
          partner_id: session.partnerId,
          name: 'Firespot',
          logo_url: `${window.location.origin}/icons/firespot_logo.svg`,
          policy_url: 'https://firespot.co/privacy',
          theme_color: '#FB5012',
        },
        onSuccess,
        onClose,
        onError: () => onError('Verification could not be completed.'),
      })
    } catch (err) {
      setLoading(false)
      onError(
        err instanceof Error ? err.message : 'Could not start verification.',
      )
    }
  }, [session, onSuccess, onClose, onError])

  useEffect(() => {
    launch()
  }, [launch])

  if (!loading) return null

  return (
    <p className="text-sm text-[#00000080] text-center">
      Opening secure verification…
    </p>
  )
}
