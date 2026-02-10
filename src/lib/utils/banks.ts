/**
 * Standardized names for display in the bank transfer drawer
 */
export const ALL_BANKS = [
  'OPay',
  'Kuda',
  'GTBank',
  'Access Bank',
  'First Bank',
  'Moniepoint',
  'Zenith Bank',
  'UBA',
  'Palmpay',
  'Providus',
  'WEMA',
  'Sterling Bank',
  'Alat By Wema',
  'Polaris Bank',
  'FCMB',
  'Fidelity Bank',
  'Ecobank',
  'Heritage Bank',
  'Keystone Bank',
  'Union Bank',
  'Unity Bank',
  'Stanbic IBTC',
  'Standard Chartered',
  'Citibank',
  'Globus Bank',
  'Jaiz Bank',
  'Lotus Bank',
  'Suntrust Bank',
  'Parallex Bank',
  'PremiumTrust Bank',
  'Carbon',
  'Paga',
  'VFD',
  'Grey',
  'Chipper Cash',
  'Cowrywise',
  'Piggyvest',
  'Airtel Smartcash',
] as const


export const POPULAR_BANKS = [
  // Direct deeplinks (open app directly)
  'OPay',
  'Kuda',
  'Moniepoint',
  'Palmpay',
  'WEMA', 
  'Alat By Wema',
  'FCMB',
  // Store links (open app store)
  'UBA',
  'Providus',
  'Fidelity Bank',
  // Other popular banks
  'GTBank',
  'Access Bank',
  'Zenith Bank',
  'First Bank',
  'Sterling Bank',
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
