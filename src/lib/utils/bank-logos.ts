// Bank name to logo mapping
// File names are in kebab-case format in /bank_logos folder
// Only includes banks with deeplinks defined in bank-deeplinks.ts

export const BANK_PLACEHOLDER = '/bank_logos/bank_placeholder.png'

const BANK_LOGO_MAP: Record<string, string> = {
  // Major Banks
  'access bank': 'access-bank.png',
  'access bank (diamond)': 'access-bank-diamond.png',
  'access diamond': 'access-bank-diamond.png',
  'diamond bank': 'access-bank-diamond.png',
  'wema bank': 'wema-bank.png',
  alat: 'alat-by-wema.png',
  polaris: 'polaris-bank.png',
  wema: 'wema-bank.png',
  citibank: 'citibank-nigeria.png',
  'citibank nigeria': 'citibank-nigeria.png',
  ecobank: 'ecobank-nigeria.png',
  'ecobank nigeria': 'ecobank-nigeria.png',
  'fidelity bank': 'fidelity-bank.png',
  fidelity: 'fidelity-bank.png',
  'first bank': 'firstbank.jpg',
  'first bank of nigeria': 'firstbank.jpg',
  firstbank: 'firstbank.jpg',
  fcmb: 'first-city-monument-bank.png',
  'first city monument bank': 'first-city-monument-bank.png',
  'globus bank': 'globus-bank.png',
  globus: 'globus-bank.png',
  gtbank: 'guaranty-trust-bank.png',
  gtb: 'guaranty-trust-bank.png',
  'guaranty trust bank': 'guaranty-trust-bank.png',
  'gt bank': 'guaranty-trust-bank.png',
  'heritage bank': 'heritage-bank.png',
  heritage: 'heritage-bank.png',
  'jaiz bank': 'jaiz-bank.png',
  jaiz: 'jaiz-bank.png',
  'keystone bank': 'keystone-bank.png',
  keystone: 'keystone-bank.png',
  kuda: 'kuda-bank.png',
  'kuda bank': 'kuda-bank.png',
  'kuda microfinance bank': 'kuda-bank.png',
  'lotus bank': 'lotus-bank.png',
  lotus: 'lotus-bank.png',
  'providus bank': 'providus-bank.png',
  providus: 'providus-bank.png',
  'stanbic ibtc': 'stanbic-ibtc-bank.png',
  'stanbic ibtc bank': 'stanbic-ibtc-bank.png',
  'standard chartered': 'standard-chartered-bank.png',
  'standard chartered bank': 'standard-chartered-bank.png',
  'sterling bank': 'sterling-bank.jpg',
  sterling: 'sterling-bank.jpg',
  'suntrust bank': 'suntrust-bank.png',
  suntrust: 'suntrust-bank.png',
  'parallex bank': 'parallex.jpeg',
  'premiumtrust bank': 'premium_trust.jpg',
  uba: 'uba.jpg',
  'united bank for africa': 'uba.jpg',
  'union bank': 'union-bank-of-nigeria.png',
  'union bank of nigeria': 'union-bank-of-nigeria.png',
  'unity bank': 'unity.jpg',
  unity: 'unity.jpg',
  'zenith bank': 'zenith-bank.png',
  zenith: 'zenith-bank.png',

  // Fintech & Digital Banks
  moniepoint: 'moniepoint.jpg',
  'moniepoint mfb': 'moniepoint.jpg',
  'moniepoint microfinance bank': 'moniepoint.jpg',
  opay: 'paycom.png',
  'opay digital services': 'paycom.png',
  palmpay: 'palmpay.png',
  paga: 'paga.png',
  carbon: 'carbon.png',
  vfd: 'vfd.jpg',
  'vfd microfinance bank': 'vfd.jpg',
  grey: 'greyfinance.jpeg',
  'chipper cash': 'chippercash.jpg',
  chipper: 'chippercash.jpg',
  cowrywise: 'cowrywise.jpeg',
  piggyvest: 'piggyvest.jpg',
  'airtel smartcash': 'airtel-smartcash-psb-ng.png',
  smartcash: 'airtel-smartcash-psb-ng.png',
}

/**
 * Get the logo path for a bank (best-effort mapping)
 * Use with BankLogo component which handles missing files gracefully
 */
export function getBankLogoPath(bankName: string): string {
  if (!bankName) return BANK_PLACEHOLDER

  const normalizedName = bankName.toLowerCase().trim()

  // Direct match
  if (BANK_LOGO_MAP[normalizedName]) {
    return `/bank_logos/${BANK_LOGO_MAP[normalizedName]}`
  }

  // Try partial matching
  for (const [key, logo] of Object.entries(BANK_LOGO_MAP)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return `/bank_logos/${logo}`
    }
  }

  return BANK_PLACEHOLDER
}

/**
 * Get the first letter of a bank name for fallback display
 */
export function getBankInitial(bankName: string): string {
  if (!bankName) return 'B'
  return bankName.charAt(0).toUpperCase()
}
