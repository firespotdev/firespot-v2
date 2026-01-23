'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import { getBankLogoPath, getBankInitial } from '@/lib/utils/bank-logos'
import { ALL_BANKS } from '@/lib/utils/all-banks'
import { sortBanksByPopularity } from '@/lib/utils/popular-banks'
import { openBankingApp } from '@/lib/utils/bank-deeplinks'
import { showNotificationToast } from '@/components/ui'

interface BankTransferDrawerProps {
  accountNumber: string
  bankName: string
  accountName: string
  onCopy?: () => void
  closeDrawer?: () => void
}

export function BankTransferDrawer({
  accountNumber,
  bankName,
  onCopy,
}: BankTransferDrawerProps) {
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)

  const handleCopyAccountNumber = () => {
    navigator.clipboard.writeText(accountNumber)
    setCopiedAccount(accountNumber)
    showNotificationToast({ message: 'Account number copied!' })
    onCopy?.()
    setTimeout(() => setCopiedAccount(null), 2000)
  }

  const handleBankClick = (bankName: string) => {
    openBankingApp(bankName)
  }

  const renderBankLogo = (bankName: string) => {
    const logoPath = getBankLogoPath(bankName)
    const isDefaultLogo = logoPath.includes('default-image.png')

    if (isDefaultLogo) {
      return (
        <div className="w-18 h-18 bg-[#0075FF] rounded-[20px] flex items-center justify-center">
          <span className="text-white font-bold text-lg font-sofia-pro">
            {getBankInitial(bankName)}
          </span>
        </div>
      )
    }

    return (
      <div className="w-18 h-18 relative rounded-[20px] overflow-hidden bg-white border border-[#0000001A]">
        <Image
          src={logoPath}
          alt={`${bankName} logo`}
          fill
          className="object-cover"
        />
      </div>
    )
  }

  // Sort banks with popular ones first
  const sortedBanks = sortBanksByPopularity([...ALL_BANKS])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="bg-linear-to-br from-[#FB5012] to-[#D72483] mt-1.5 p-2.5 relative flex items-center justify-between">
        {/* Bank Name */}
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-[#FFFFFFB2] font-medium">Bank name</p>
          <p className="text-base font-bold text-white leading-none">
            {bankName}
          </p>
        </div>

        {/* Account Number */}
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-[#FFFFFFB2] font-medium">Account number</p>
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-white leading-none">
              {accountNumber}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopyAccountNumber}
          type="button"
          className="w-9 h-9 rounded-full bg-[#00000033] flex items-center justify-center"
          aria-label="Copy account number"
        >
          {copiedAccount === accountNumber ? (
            <Check className="w-3.5 h-3.5 text-white" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-white" />
          )}
        </button>
      </div>

      {/* Bank Grid */}
      <div className="flex-1 overflow-y-auto px-4 mt-5 pb-5">
        <div className="grid grid-cols-4 gap-4">
          {sortedBanks.map((bank) => (
            <button
              key={bank}
              onClick={() => handleBankClick(bank)}
              type="button"
              className="flex flex-col items-center gap-1 active:opacity-70 transition-opacity"
            >
              {renderBankLogo(bank)}
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
