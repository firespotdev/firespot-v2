import { safeLocalStorage } from './storage'

const storageKey = (merchantId: string) => `firespot-frequent-picks:${merchantId}`
// Enough history to rank by, without growing the stored record forever.
const MAX_TRACKED = 50

type PickCounts = Record<string, number>

function readCounts(merchantId: string): PickCounts {
  try {
    const parsed = JSON.parse(safeLocalStorage.getItem(storageKey(merchantId)) || '{}')
    return parsed && typeof parsed === 'object' ? (parsed as PickCounts) : {}
  } catch {
    return {}
  }
}

/**
 * Product ids this customer has picked from a business's item search on this
 * device, most picked first. Kept on the device only.
 */
export function readFrequentPicks(merchantId: string): string[] {
  return Object.entries(readCounts(merchantId))
    .sort(([, a], [, b]) => b - a)
    .map(([productId]) => productId)
}

/** Counts one pick (opening or adding an item from search). */
export function recordFrequentPick(merchantId: string, productId: string) {
  const counts = readCounts(merchantId)
  const next = { ...counts, [productId]: (counts[productId] ?? 0) + 1 }
  const trimmed = Object.fromEntries(
    Object.entries(next)
      .sort(([, a], [, b]) => b - a)
      .slice(0, MAX_TRACKED),
  )
  safeLocalStorage.setItem(storageKey(merchantId), JSON.stringify(trimmed))
}
