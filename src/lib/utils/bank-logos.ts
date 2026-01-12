// Bank name to logo mapping
// File names are in kebab-case format in /bank_logos folder

const BANK_LOGO_MAP: Record<string, string> = {
  // Major Banks
  'access bank': 'access-bank.png',
  'access bank (diamond)': 'access-bank-diamond.png',
  'access diamond': 'access-bank-diamond.png',
  'diamond bank': 'access-bank-diamond.png',
  'alat by wema': 'alat-by-wema.png',
  alat: 'alat-by-wema.png',
  'wema bank': 'alat-by-wema.png',
  citibank: 'citibank-nigeria.png',
  'citibank nigeria': 'citibank-nigeria.png',
  ecobank: 'ecobank-nigeria.png',
  'ecobank nigeria': 'ecobank-nigeria.png',
  'fidelity bank': 'fidelity-bank.png',
  fidelity: 'fidelity-bank.png',
  'first bank': 'first-bank-of-nigeria.png',
  'first bank of nigeria': 'first-bank-of-nigeria.png',
  firstbank: 'first-bank-of-nigeria.png',
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
  'stanbic ibtc': 'default-image.png',
  'stanbic ibtc bank': 'default-image.png',
  'standard chartered': 'default-image.png',
  'standard chartered bank': 'default-image.png',
  'sterling bank': 'default-image.png',
  sterling: 'default-image.png',
  'suntrust bank': 'suntrust-bank.png',
  suntrust: 'suntrust-bank.png',
  'titan trust bank': 'titan-paystack.png',
  titan: 'titan-paystack.png',
  uba: 'default-image.png',
  'united bank for africa': 'default-image.png',
  'union bank': 'default-image.png',
  'union bank of nigeria': 'default-image.png',
  'unity bank': 'unity-bank.png',
  unity: 'unity-bank.png',
  'zenith bank': 'default-image.png',
  zenith: 'default-image.png',
  'polaris bank': 'default-image.png',
  polaris: 'default-image.png',

  // Fintech & Digital Banks
  moniepoint: 'moniepoint-mfb-ng.png',
  'moniepoint mfb': 'moniepoint-mfb-ng.png',
  'moniepoint microfinance bank': 'moniepoint-mfb-ng.png',
  opay: 'default-image.png',
  'opay digital services': 'default-image.png',
  palmpay: 'palmpay.png',
  paga: 'paga.png',
  paycom: 'paycom.png',
  carbon: 'carbon.png',
  'one finance': 'carbon.png',
  vfd: 'vfd.png',
  'vfd microfinance bank': 'vfd.png',
  vbank: 'vfd.png',
  eyowo: 'eyowo.png',
  gomoney: 'gomoney.png',
  branch: 'branch.png',
  tangerine: 'tangerine-money.png',
  'tangerine money': 'tangerine-money.png',

  // Mobile Money / PSB
  '9mobile': '9mobile-9payment-service-bank-ng.png',
  '9psb': '9mobile-9payment-service-bank-ng.png',
  '9payment service bank': '9mobile-9payment-service-bank-ng.png',
  'airtel smartcash': 'airtel-smartcash-psb-ng.png',
  smartcash: 'airtel-smartcash-psb-ng.png',
  'mtn momo': 'mtn-momo-psb-ng.png',
  momo: 'mtn-momo-psb-ng.png',
  'mtn mobile money': 'mtn-momo-psb-ng.png',
  hopepsb: 'hopepsb-ng.png',
  'hope psb': 'hopepsb-ng.png',

  // Microfinance Banks
  'abbey mortgage bank': 'abbey-mortgage-bank.png',
  abbey: 'abbey-mortgage-bank.png',
  'above only mfb': 'above-only-mfb.png',
  'accion microfinance bank': 'accion-microfinance-bank-ng.png',
  'accion mfb': 'accion-microfinance-bank-ng.png',
  'ampersand microfinance bank': 'ampersand-microfinance-bank-ng.png',
  'amju unique mfb': 'amju-unique-mfb.png',
  'amegy microfinance bank': 'amegy-microfinance-bank-ng.png',
  'aso savings': 'asosavings.png',
  'aso savings and loans': 'asosavings.png',
  'bowen microfinance bank': 'bowen-microfinance-bank.png',
  'bowen mfb': 'bowen-microfinance-bank.png',
  'cashconnect mfb': 'cashconnect-mfb-ng.png',
  'cemcs microfinance bank': 'cemcs-microfinance-bank.png',
  cemcs: 'cemcs-microfinance-bank.png',
  'ekondo microfinance bank': 'ekondo-microfinance-bank.png',
  'ekondo mfb': 'ekondo-microfinance-bank-ng.png',
  'firmus mfb': 'firmus-mfb.png',
  'gateway mortgage bank': 'gateway-mortgage-bank.png',
  'ibile mfb': 'ibile-mfb.png',
  'infinity mfb': 'infinity-mfb.png',
  'kredi money mfb': 'kredi-money-mfb.png',
  'living trust mortgage bank': 'living-trust-mortgage-bank.png',
  'mint mfb': 'mint-mfb.png',
  'optimus bank': 'optimus-bank-ltd.png',
  'parallex bank': 'parallex-bank.png',
  'parkway readycash': 'parkway-ready-cash.png',
  'peace microfinance bank': 'peace-microfinance-bank-ng.png',
  'platinum mortgage bank': 'platinum-mortgage-bank-ng.png',
  'premiumtrust bank': 'premiumtrust-bank-ng.png',
  'quickfund mfb': 'quickfund-mfb.png',
  'rand merchant bank': 'rand-merchant-bank.png',
  'refuge mortgage bank': 'refuge-mortgage-bank.png',
  'rockshield microfinance bank': 'rockshield-microfinance-bank-ng.png',
  'rubies mfb': 'rubies-mfb.png',
  'safe haven mfb': 'safe-haven-mfb-ng.png',
  'safe haven microfinance bank': 'safe-haven-microfinance-bank-limited-ng.png',
  'sage grey finance': 'sage-grey-finance-limited-ng.png',
  'shield mfb': 'shield-mfb-ng.png',
  'solid allianze mfb': 'solid-allianze-mfb.png',
  'solid rock mfb': 'solid-rock-mfb.png',
  'stellas mfb': 'stellas-mfb.png',
  'tcf mfb': 'tcf-mfb.png',
  'unilag microfinance bank': 'unilag-microfinance-bank-ng.png',
  'unical mfb': 'unical-mfb.png',
  'uhuru mfb': 'uhuru-mfb-ng.png',
  'waya microfinance bank': 'waya-microfinance-bank-ng.png',
}

/**
 * Get the logo path for a bank
 * @param bankName - The name of the bank
 * @returns The path to the bank logo or default image
 */
export function getBankLogoPath(bankName: string): string {
  if (!bankName) return '/bank_logos/default-image.png'

  const normalizedName = bankName.toLowerCase().trim()

  // Direct match
  if (BANK_LOGO_MAP[normalizedName]) {
    return `/bank_logos/${BANK_LOGO_MAP[normalizedName]}`
  }

  // Try partial matching - check if the bank name contains any of our keys
  for (const [key, logo] of Object.entries(BANK_LOGO_MAP)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return `/bank_logos/${logo}`
    }
  }

  // Try to match by converting to slug format
  const slugName = normalizedName
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')

  // Check if file might exist with common patterns
  const possibleFiles = [
    `${slugName}.png`,
    `${slugName}-ng.png`,
    `${slugName}-mfb.png`,
    `${slugName}-mfb-ng.png`,
  ]

  // Return the first letter fallback or default
  return '/bank_logos/default-image.png'
}

/**
 * Get the first letter of a bank name for fallback display
 * @param bankName - The name of the bank
 * @returns The first letter uppercased
 */
export function getBankInitial(bankName: string): string {
  if (!bankName) return 'B'
  return bankName.charAt(0).toUpperCase()
}
