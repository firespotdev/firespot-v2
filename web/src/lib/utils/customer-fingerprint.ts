import { safeLocalStorage } from './storage'

/**
 * Generates a unique customer fingerprint for tracking returning customers
 * Uses localStorage to persist the fingerprint across sessions
 */
export function getCustomerFingerprint(): string {
  const STORAGE_KEY = 'firespot_customer_fingerprint'

  // Check if we already have a fingerprint stored
  if (typeof window !== 'undefined') {
    const stored = safeLocalStorage.getItem(STORAGE_KEY)
    if (stored) {
      return stored
    }

    // Generate a new fingerprint
    // Combine browser characteristics for uniqueness
    let canvasData = ''
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillText('Firespot fingerprint', 2, 2)
      }
      canvasData = canvas.toDataURL()
    } catch {
      // In-app browsers or privacy settings may block canvas pixel extraction
      canvasData = 'canvas_restricted'
    }

    const fingerprint = [
      navigator.userAgent || '',
      navigator.language || '',
      window.screen?.width || 0,
      window.screen?.height || 0,
      window.screen?.colorDepth || 0,
      new Date().getTimezoneOffset(),
      canvasData,
      navigator.hardwareConcurrency || 0,
      (navigator as any).deviceMemory || 0,
    ]
      .join('|')
      .replace(/[^a-zA-Z0-9|]/g, '')

    // Create a simple hash
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    const fingerprintId = `fp_${Math.abs(hash).toString(
      36,
    )}_${Date.now().toString(36)}`

    // Store it for future use
    safeLocalStorage.setItem(STORAGE_KEY, fingerprintId)

    return fingerprintId
  }

  // Fallback for SSR
  return `fp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

