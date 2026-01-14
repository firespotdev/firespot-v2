'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Copy, Check, ChevronRight, ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useMerchantBySerial } from '@/services/qr'
import { useRecordAccountCopy } from '@/services/scans'
import { LoaderCircle, showNotificationToast } from '@/components/ui'
import { getBankLogoPath, getBankInitial } from '@/lib/utils/bank-logos'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'
import type { MerchantProfile } from '@/services/qr/interface'

type BankAccount = MerchantProfile['bankAccounts'][0]

export default function PaymentPage() {
  const params = useParams()
  const serialNumber = params.serialNumber as string
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)
  const [selectedBankAccount, setSelectedBankAccount] =
    useState<BankAccount | null>(null)
  const recordCopy = useRecordAccountCopy()
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const { data: merchant, isLoading, error } = useMerchantBySerial(serialNumber)

  const handleCopyAccountNumber = (accountNumber: string) => {
    navigator.clipboard.writeText(accountNumber)
    setCopiedAccount(accountNumber)
    showNotificationToast({ message: 'Account number copied!' })

    // Record copy event
    recordCopy.mutate(serialNumber, {
      onError: (err) => {
        // Silently fail - don't interrupt user experience
        console.error('Failed to record copy event:', err)
      },
    })

    setTimeout(() => setCopiedAccount(null), 2000)
  }

  // Render bank logo with fallback to initial
  const renderBankLogo = (bankName?: string) => {
    if (!bankName) return null

    const logoPath = getBankLogoPath(bankName)
    const isDefaultLogo = logoPath.includes('default-image.png')

    if (isDefaultLogo) {
      // Fallback to letter icon for banks without logos
      return (
        <div className="w-6 h-6 bg-[#0075FF] rounded-[6.67px] flex items-center justify-center">
          <span className="text-white font-bold text-xs">
            {getBankInitial(bankName)}
          </span>
        </div>
      )
    }

    return (
      <Image
        src={logoPath}
        alt={`${bankName} logo`}
        width={24}
        height={24}
        className="w-6 h-6 rounded-[6.67px] object-contain"
      />
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center">
        <LoaderCircle innerBg="#F4F6F8" />
      </div>
    )
  }

  if (error || !merchant) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h1 className="text-xl font-bold text-black mb-2">
            QR Code Not Found
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            This QR code is not active or doesn&apos;t exist. Please check the
            QR code and try again.
          </p>
          <Link
            href="/"
            className="text-black underline underline-offset-4 text-sm font-medium"
          >
            Scan another QR code
          </Link>
        </div>
      </div>
    )
  }

  const primaryAccount = merchant.bankAccounts.find((acc) => acc.isPrimary)
  const defaultBankAccount = primaryAccount || merchant.bankAccounts[0]
  const bankAccount = selectedBankAccount || defaultBankAccount

  const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.charAt(0).toUpperCase()
  }

  const handleOpenBankDrawer = () => {
    if (
      !merchant ||
      !merchant.bankAccounts ||
      merchant.bankAccounts.length === 0
    ) {
      console.warn('Cannot open drawer: No merchant or bank accounts available')
      return
    }

    console.log('Opening bank selection drawer')
    openDrawer({
      type: 'select-bank',
      direction: 'bottom',
      props: {
        bankAccounts: merchant.bankAccounts,
        onSelectBank: (bankAccount: BankAccount) => {
          console.log('Bank selected:', bankAccount.bankName)
          setSelectedBankAccount(bankAccount)
        },
      },
    })
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <div className="max-w-[500px] mx-auto min-h-screen flex flex-col font-satoshi">
        <PageHeader
          title="Transfer to"
          showDropdown
          onTitleClick={handleOpenBankDrawer}
          onShareClick={() => {
            // Share functionality
            console.log('Share clicked')
          }}
        />

        <div className="flex-1 px-4 pb-32 flex flex-col justify-evenly">
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center">
          {merchant.profilePhotoUrl ? (
            <Image
              src={merchant.profilePhotoUrl}
              alt={merchant.businessName}
              width={96}
              height={96}
              className="w-[96px] h-[96px] rounded-full object-cover"
            />
          ) : (
            <div className="w-[96px] h-[96px] rounded-full bg-[#FF6B35] flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {getInitials(merchant.businessName)}
              </span>
            </div>
          )}

          <h1 className="font-bold text-xl text-black mt-4 text-center leading-none">
            {merchant.businessName}
          </h1>

          {merchant.merchantSlug && (
            <Link
              href={`/merchant/${merchant.merchantSlug}`}
              className="mt-1 text-sm text-[#00000080] font-medium flex items-center gap-1"
            >
              View full business profile{' '}
              <ChevronRight className="w-4 h-4 text-[#747576]" />
            </Link>
          )}
        </div>

        {/* Bank Account Card */}
        {bankAccount && (
          <div className="bg-white rounded-2xl py-4 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col justify-center items-center mb-4 px-4">
              <p className="text-sm text-[#00000066] font-medium">
                Recipient Bank
              </p>
              <div className="flex items-center gap-2 mt-1">
                {renderBankLogo(bankAccount.bankName)}
                <p className="text-base font-bold text-black">
                  {bankAccount.bankName}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center border-t border-[#F1F1F1] pt-4 px-4">
              <p className="text-sm text-[#00000066] font-medium mb-1">
                Account number
              </p>
              <div className="flex items-center gap-1">
                <p className="text-lg font-bold text-black">
                  {bankAccount.accountNumber}
                </p>
                <button
                  onClick={() =>
                    handleCopyAccountNumber(bankAccount.accountNumber)
                  }
                  type="button"
                  className="p-1 rounded"
                >
                  {copiedAccount === bankAccount.accountNumber ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#878F98]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-[#00000066] text-center px-4">
          Review the details carefully before proceeding. Please note that
          successful transfers cannot be reversed.
        </p>

          {/* Pagination Dots */}
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00000066]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#0000001A]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#0000001A]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#0000001A]" />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#F1F1F1] fixed bottom-0 left-0 right-0 bg-white rounded-2xl">
          <div className="max-w-[500px] mx-auto p-4 pb-6">
            <Button
              className="w-full bg-black text-white rounded-[48px] h-12 font-bold"
              onClick={() => {
                // Handle send with bank app
                console.log('Send with bank app clicked')
              }}
            >
              Send with my bank app
            </Button>

            <Link
              href="/login"
              className="w-full text-xs text-[#878F98] font-medium flex items-center justify-center gap-0.5 mt-4 underline underline-offset-4"
            >
              I want something like this for my business
              <ArrowUpRight className="w-3 h-3 text-[#878F98] mt-[1%]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
