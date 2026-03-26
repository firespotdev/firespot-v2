export interface BankAccount {
  bankName: string
  bankCode?: string
  accountNumber: string
  accountName?: string
  isPrimary?: boolean
}

/**
 * Sorts bank accounts to ensure primary accounts appear first.
 * @param accounts - Array of bank accounts to sort
 * @returns A new sorted array of bank accounts
 */
export function sortBankAccounts(accounts: BankAccount[]): BankAccount[] {
  if (!accounts) return []
  return [...accounts].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1
    if (!a.isPrimary && b.isPrimary) return 1
    return 0
  })
}

export const getBankLogo = (bankName?: string) => {
  if (!bankName) return '/bank_logos/bank_placeholder.png'

  const name = bankName.toLowerCase()
  if (name.includes('kuda')) return '/bank_logos/kuda-bank.png'
  if (name.includes('moniepoint')) return '/bank_logos/moniepoint.jpg'
  if (name.includes('zenith')) return '/bank_logos/zenith-bank.png'
  if (
    name.includes('gtbank') ||
    name.includes('guaranty trust') ||
    name.includes('gtb')
  )
    return '/bank_logos/guaranty-trust-bank.png'
  if (name.includes('access')) return '/bank_logos/access-bank.png'
  if (name.includes('uba') || name.includes('united bank'))
    return '/bank_logos/uba.jpg'
  if (name.includes('first bank')) return '/bank_logos/firstbank.jpg'
  if (name.includes('palmpay')) return '/bank_logos/palmpay.png'
  if (name.includes('opay') || name.includes('paycom'))
    return '/bank_logos/paycom.png'
  if (name.includes('wema')) return '/bank_logos/wema-bank.png'
  if (name.includes('stanbic')) return '/bank_logos/stanbic-ibtc-bank.png'
  if (name.includes('fidelity')) return '/bank_logos/fidelity-bank.png'
  if (name.includes('eco')) return '/bank_logos/ecobank-nigeria.png'
  if (name.includes('vfd')) return '/bank_logos/vfd.jpg'
  if (name.includes('fcmb')) return '/bank_logos/first-city-monument-bank.png'

  // Generic fallback: try to find a match or use placeholder
  return '/bank_logos/bank_placeholder.png'
}
