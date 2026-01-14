export const POPULAR_BANKS = [
  'GTBank',
  'Access Bank',
  'FCMB',
  'OPay',
  'Kuda',
  'Moniepoint',
  'Zenith Bank',
  'UBA',
  'Palmpay',
  'Providus',
  'WEMA',
  'Sterling Bank',
  'First Bank',
  'Fidelity Bank',
  'Paga',
] as const

/**
 * Sort banks array with popular banks appearing first
 * @param banks - Array of bank names
 * @returns Sorted array with popular banks first, then others alphabetically
 */
export function sortBanksByPopularity(banks: string[]): string[] {
  const popularSet = new Set(POPULAR_BANKS)
  const popular = banks.filter((b) => popularSet.has(b as any))
  const others = banks.filter((b) => !popularSet.has(b as any))

  // Sort popular banks by their order in POPULAR_BANKS
  const sortedPopular = popular.sort((a, b) => {
    const indexA = POPULAR_BANKS.indexOf(a as any)
    const indexB = POPULAR_BANKS.indexOf(b as any)
    return indexA - indexB
  })

  // Sort others alphabetically
  const sortedOthers = others.sort()

  return [...sortedPopular, ...sortedOthers]
}
