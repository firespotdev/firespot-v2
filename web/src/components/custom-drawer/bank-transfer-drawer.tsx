'use client'

import { BankLogo } from '@/components/ui/bank-logo'
import { ALL_BANK_NAMES, sortBanksByPopularity, openBankingApp } from '@/lib/utils/bank-registry'

interface BankTransferDrawerProps {
  /** Notifies the opener which bank the customer is sending from */
  onBankSelect?: (bankName: string) => void
  closeDrawer?: () => void
}

export function BankTransferDrawer({
  onBankSelect,
  closeDrawer,
}: BankTransferDrawerProps) {
  const handleBankClick = (bankName: string) => {
    onBankSelect?.(bankName)
    openBankingApp(bankName)
    if (onBankSelect) {
      closeDrawer?.()
    }
  }

  // Sort banks with popular ones first
  const sortedBanks = sortBanksByPopularity([...ALL_BANK_NAMES])

  return (
    <div className="flex flex-col overflow-hidden bg-white">
      <div className="flex-1 overflow-y-auto px-4 mt-1 pb-5 border-t-2 border-[#F1F1F1]">
        <div className="grid grid-cols-4 gap-4 pt-4">
          {sortedBanks.map((bank) => (
            <button
              key={bank}
              onClick={() => handleBankClick(bank)}
              type="button"
              className="flex flex-col items-center gap-1 active:opacity-70 transition-opacity"
            >
              <BankLogo
                bankName={bank}
                size={72}
                className="rounded-4xl border border-[#0000001A]"
              />
              <p className="text-xs text-black font-medium text-center font-sofia-pro -tracking-[0.32px] leading-none">
                {bank}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
