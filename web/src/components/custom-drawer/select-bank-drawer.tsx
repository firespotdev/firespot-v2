'use client'

import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useDrawerStore } from '@/services/drawer'
import { TagFooter, BankLogo } from '../ui'

interface BankAccount {
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  isPrimary: boolean
}

export interface SelectBankDrawerProps {
  bankAccounts: BankAccount[]
  onSelectBank: (bankAccount: BankAccount) => void
  onBack?: () => void
}

export function SelectBankHeaderLeft({ onBack }: { onBack?: () => void }) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  if (!onBack) return null

  return (
    <button
      type="button"
      onClick={() => {
        closeDrawer('select-bank')
        onBack()
      }}
      aria-label="Back"
      className="w-9 h-9 flex items-center justify-center text-black"
    >
      <ArrowLeft size={22} strokeWidth={2.2} />
    </button>
  )
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
    closeDrawer('select-bank')
  }

  // Sort accounts: primary first, then by name
  const sortedAccounts = [...bankAccounts].sort((a, b) => {
    if (a.isPrimary) return -1
    if (b.isPrimary) return 1
    return a.bankName.localeCompare(b.bankName)
  })

  const hasExplicitPrimary = sortedAccounts.some((a) => a.isPrimary)
  const primaryAccounts = hasExplicitPrimary
    ? sortedAccounts.filter((a) => a.isPrimary)
    : sortedAccounts.slice(0, 1)
  const secondaryAccounts = hasExplicitPrimary
    ? sortedAccounts.filter((a) => !a.isPrimary)
    : sortedAccounts.slice(1)

  return (
    <div className="px-3">
      <div className="flex-1 overflow-y-auto">
        {sortedAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-[#00000066] text-sm">
              No bank accounts available
            </p>
          </div>
        ) : (
          <>
            {primaryAccounts.length > 0 && (
              <div className="bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden mb-3 border border-[#F1F1F1]">
                {primaryAccounts.map((account, index) => (
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
                      {index === 0 && (
                        <p className="text-xs text-[#64748B] font-medium">
                          Most preferred
                        </p>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {secondaryAccounts.length > 0 && (
              <div className="bg-white rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] overflow-hidden mb-2 border border-[#F1F1F1]">
                {secondaryAccounts.map((account) => (
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
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <TagFooter />
    </div>
  )
}

