'use client'

import { ChevronRight } from 'lucide-react'
import { useDrawerStore } from '@/services/drawer'
import { TagFooter, BankLogo } from '../ui'

interface BankAccount {
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  isPrimary: boolean
}

interface SelectBankDrawerProps {
  bankAccounts: BankAccount[]
  onSelectBank: (bankAccount: BankAccount) => void
}

export function SelectBankDrawer({
  bankAccounts,
  onSelectBank,
}: SelectBankDrawerProps) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)

  // Ensure we have valid props
  if (!bankAccounts || !Array.isArray(bankAccounts)) {
    return (
      <div className="px-4 pb-4">
        <p className="text-sm text-[#00000066] text-center py-12">
          No bank accounts available
        </p>
      </div>
    )
  }

  const handleSelectBank = (bankAccount: BankAccount) => {
    onSelectBank(bankAccount)
    closeDrawer()
  }

  // Sort accounts: primary first, then by name
  const sortedAccounts = [...bankAccounts].sort((a, b) => {
    if (a.isPrimary) return -1
    if (b.isPrimary) return 1
    return a.bankName.localeCompare(b.bankName)
  })

  return (
    <div className="px-4">
      <div className="flex-1 overflow-y-auto">
        {sortedAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-[#00000066] text-sm">
              No bank accounts available
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden mb-3">
              {sortedAccounts
                .filter((account) => account.isPrimary)
                .map((account, index) => (
                  <button
                    key={account.accountNumber}
                    onClick={() => handleSelectBank(account)}
                    type="button"
                    className="w-full flex items-center gap-3 py-3 px-4 border-b border-[#EBEBEB] last:border-b-0 hover:bg-[#F4F6F8] transition-colors"
                  >
                    <BankLogo
                      bankName={account.bankName}
                      size={36}
                      className="rounded-[10px]"
                    />

                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-sm text-[#0F172A] truncate">
                        {account.bankName}
                      </p>
                      {index === 0 && account.isPrimary && (
                        <p className="text-xs text-[#64748B] font-medium">
                          Most preferred
                        </p>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
                  </button>
                ))}
            </div>
            <div className="bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden mb-2">
              {sortedAccounts
                .filter((account) => !account.isPrimary)
                .map((account, index) => (
                  <button
                    key={account.accountNumber}
                    onClick={() => handleSelectBank(account)}
                    type="button"
                    className="w-full flex items-center gap-3 py-3 px-4 border-b border-[#EBEBEB] last:border-b-0"
                  >
                    <BankLogo
                      bankName={account.bankName}
                      size={36}
                      className="rounded-[10px]"
                    />

                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-sm text-[#0F172A] truncate">
                        {account.bankName}
                      </p>
                      {index === 0 && account.isPrimary && (
                        <p className="text-xs text-[#64748B] font-medium">
                          Most preferred
                        </p>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
                  </button>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <TagFooter />
    </div>
  )
}
