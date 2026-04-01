import banksData from '@/lib/utils/nigerian-banks.json'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Bank {
  name: string
  slug: string
  code: string
  aliases: string[]
  logo: string
  deeplink: string | { ios: string; android: string } | null
  isPopular: boolean
}

export interface BankAccount {
  bankName: string
  bankCode?: string
  accountNumber: string
  accountName?: string
  isPrimary?: boolean
}

// ---------------------------------------------------------------------------
// Data — loaded once from the static JSON
// ---------------------------------------------------------------------------

const BANKS: Bank[] = banksData as Bank[]

/** Only banks marked as popular, preserving their JSON order. */
const POPULAR_BANKS: Bank[] = BANKS.filter((b) => b.isPopular)

/** All display names (matches old `ALL_BANKS` constant). */
const ALL_BANK_NAMES: string[] = BANKS.map((b) => b.name)

// ---------------------------------------------------------------------------
// Lookup Map — built once at module init for O(1) matching
// ---------------------------------------------------------------------------

/** Maps *lowercase* name / alias → Bank object */
const BANK_LOOKUP = new Map<string, Bank>()

for (const bank of BANKS) {
  // Primary name
  BANK_LOOKUP.set(bank.name.toLowerCase(), bank)
  // Slug (hyphens → spaces so "access-bank" matches "access bank")
  BANK_LOOKUP.set(bank.slug.replace(/-/g, ' '), bank)
  // Every alias
  for (const alias of bank.aliases) {
    BANK_LOOKUP.set(alias.toLowerCase(), bank)
  }
}

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

const BANK_PLACEHOLDER = '/bank_logos/bank_placeholder.png'

/**
 * Resolve a bank name to its logo path.
 *
 * 1. Direct / alias match (O(1) via Map)
 * 2. Partial match (fallback linear scan)
 * 3. Placeholder
 */
function getBankLogo(bankName?: string): string {
  if (!bankName) return BANK_PLACEHOLDER

  const key = bankName.toLowerCase().trim()

  // Direct / alias match
  const direct = BANK_LOOKUP.get(key)
  if (direct) return `/bank_logos/${direct.logo}`

  // Partial match — try both directions
  for (const bank of BANKS) {
    const nameLower = bank.name.toLowerCase()
    if (key.includes(nameLower) || nameLower.includes(key)) {
      return `/bank_logos/${bank.logo}`
    }
    for (const alias of bank.aliases) {
      if (key.includes(alias) || alias.includes(key)) {
        return `/bank_logos/${bank.logo}`
      }
    }
  }

  return BANK_PLACEHOLDER
}

/**
 * Get the first letter of a bank name for fallback display.
 */
function getBankInitial(bankName: string): string {
  if (!bankName) return 'B'
  return bankName.charAt(0).toUpperCase()
}

// ---------------------------------------------------------------------------
// Deeplinks
// ---------------------------------------------------------------------------

function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as Record<string, unknown>).MSStream
  )
}

function isAndroid(): boolean {
  if (typeof window === 'undefined') return false
  return /Android/.test(navigator.userAgent)
}

/**
 * Look up the deeplink / store link for a bank.
 */
function getBankAppScheme(
  bankName: string,
): string | { ios: string; android: string } | null {
  const bank = getBankByName(bankName)
  return bank?.deeplink ?? null
}

/**
 * Open the banking app or its store page.
 */
function openBankingApp(bankName: string): void {
  const scheme = getBankAppScheme(bankName)
  if (!scheme) return

  if (typeof scheme === 'string') {
    window.location.href = scheme
    return
  }

  let storeLink: string | undefined
  if (isIOS()) {
    storeLink = scheme.ios
  } else if (isAndroid()) {
    storeLink = scheme.android
  } else {
    storeLink = scheme.android
  }

  if (storeLink) {
    window.open(storeLink, '_blank')
  }
}

// ---------------------------------------------------------------------------
// Bank lookup
// ---------------------------------------------------------------------------

/**
 * Find a bank by its name, slug, or any alias.
 */
function getBankByName(name: string): Bank | undefined {
  if (!name) return undefined
  const key = name.toLowerCase().trim()

  // Direct / alias
  const direct = BANK_LOOKUP.get(key)
  if (direct) return direct

  // Partial match
  for (const bank of BANKS) {
    const nameLower = bank.name.toLowerCase()
    if (key.includes(nameLower) || nameLower.includes(key)) return bank
    for (const alias of bank.aliases) {
      if (key.includes(alias) || alias.includes(key)) return bank
    }
  }

  return undefined
}

// ---------------------------------------------------------------------------
// Sorting helpers
// ---------------------------------------------------------------------------

/**
 * Sort bank name strings with popular banks first (in POPULAR_BANKS order),
 * then the rest alphabetically.
 */
function sortBanksByPopularity(banks: string[]): string[] {
  const popularNames = new Set(POPULAR_BANKS.map((b) => b.name))

  const popular = banks.filter((b) => popularNames.has(b))
  const others = banks.filter((b) => !popularNames.has(b))

  // Sort popular banks by their order in the registry
  const popularOrder = POPULAR_BANKS.map((b) => b.name)
  const sortedPopular = popular.sort(
    (a, b) => popularOrder.indexOf(a) - popularOrder.indexOf(b),
  )

  const sortedOthers = others.sort()

  return [...sortedPopular, ...sortedOthers]
}

/**
 * Sort bank accounts with primary accounts first.
 */
function sortBankAccounts(accounts: BankAccount[]): BankAccount[] {
  if (!accounts) return []
  return [...accounts].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1
    if (!a.isPrimary && b.isPrimary) return 1
    return 0
  })
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  BANKS,
  POPULAR_BANKS,
  ALL_BANK_NAMES,
  BANK_PLACEHOLDER,
  getBankLogo,
  getBankInitial,
  getBankByName,
  getBankAppScheme,
  openBankingApp,
  sortBanksByPopularity,
  sortBankAccounts,
}
