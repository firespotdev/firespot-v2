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
