/**
 * Comprehensive list of all Nigerian banks
 * Based on bank logos available in /public/bank_logos/
 * Standardized names for display in the bank transfer drawer
 */
export const ALL_BANKS = [
  // Popular banks
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
  'Alat by Wema',

  // Other major banks
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
  'Titan Trust Bank',
  'Optimus Bank',
  'Parallex Bank',
  'PremiumTrust Bank',
  'Polaris Bank',

  // Fintech & Digital Banks
  'Carbon',
  'Paga',
  'Paycom',
  'VFD',
  'Eyowo',
  'Gomoney',
  'Branch',
  'Tangerine Money',

  // Mobile Money / PSB
  '9mobile',
  'Airtel Smartcash',
  'MTN MoMo',
  'Hope PSB',

  // Microfinance Banks
  'Abbey Mortgage Bank',
  'Above Only MFB',
  'Accion Microfinance Bank',
  'Ampersand Microfinance Bank',
  'Amju Unique MFB',
  'Amegy Microfinance Bank',
  'ASO Savings',
  'Bowen Microfinance Bank',
  'Cashconnect MFB',
  'CEMCS Microfinance Bank',
  'Ekondo Microfinance Bank',
  'Firmus MFB',
  'Gateway Mortgage Bank',
  'IBILE MFB',
  'Infinity MFB',
  'Kredi Money MFB',
  'Living Trust Mortgage Bank',
  'Mint MFB',
  'Parkway ReadyCash',
  'Peace Microfinance Bank',
  'Platinum Mortgage Bank',
  'Quickfund MFB',
  'Rand Merchant Bank',
  'Refuge Mortgage Bank',
  'Rockshield Microfinance Bank',
  'Rubies MFB',
  'Safe Haven MFB',
  'Sage Grey Finance',
  'Shield MFB',
  'Solid Allianze MFB',
  'Solid Rock MFB',
  'Stellas MFB',
  'TCF MFB',
  'Unilag Microfinance Bank',
  'Unical MFB',
  'Uhuru MFB',
  'Waya Microfinance Bank',
] as const

/**
 * Popular Nigerian banks - displayed first in UI
 * Priority: 1. Direct deeplinks (OPay, Kuda, Moniepoint, Palmpay)
 *           2. Banks with app store links (UBA, Providus, Fidelity)
 *           3. Other popular banks
 */
export const POPULAR_BANKS = [
  // Direct deeplinks (open app directly)
  'OPay',
  'Kuda',
  'Moniepoint',
  'Palmpay',
  // Store links (open app store)
  'UBA',
  'Providus',
  'Fidelity Bank',
  // Other popular banks
  'GTBank',
  'Access Bank',
  'Zenith Bank',
  'First Bank',
  'FCMB',
  'WEMA',
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
