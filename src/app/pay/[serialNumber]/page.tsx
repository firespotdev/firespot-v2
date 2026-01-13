'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Copy, Check } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useMerchantBySerial } from '@/services/qr'
import { LoaderCircle, showNotificationToast } from '@/components/ui'
import { getBankLogoPath, getBankInitial } from '@/lib/utils/bank-logos'

export default function PaymentPage() {
  const params = useParams()
  const serialNumber = params.serialNumber as string
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)

  const { data: merchant, isLoading, error } = useMerchantBySerial(serialNumber)

  const handleCopyAccountNumber = (accountNumber: string) => {
    navigator.clipboard.writeText(accountNumber)
    setCopiedAccount(accountNumber)
    showNotificationToast({ message: 'Account number copied!' })
    setTimeout(() => setCopiedAccount(null), 2000)
  }

  // Render bank logo with fallback to initial
  const renderBankLogo = (bankName: string, size: 'sm' | 'lg' = 'sm') => {
    const logoPath = getBankLogoPath(bankName)
    const isDefaultLogo = logoPath.includes('default-image.png')
    const dimensions = size === 'lg' ? 48 : 32

    if (isDefaultLogo) {
      return (
        <div
          className={`${size === 'lg' ? 'w-12 h-12' : 'w-8 h-8'} bg-[#0075FF] rounded-lg flex items-center justify-center`}
        >
          <span
            className={`text-white font-bold ${size === 'lg' ? 'text-lg' : 'text-sm'}`}
          >
            {getBankInitial(bankName)}
          </span>
        </div>
      )
    }

    return (
      <Image
        src={logoPath}
        alt={`${bankName} logo`}
        width={dimensions}
        height={dimensions}
        className={`${size === 'lg' ? 'w-12 h-12' : 'w-8 h-8'} rounded-lg object-contain`}
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
          <h1 className="text-xl font-bold text-black mb-2">QR Code Not Found</h1>
          <p className="text-gray-500 text-sm mb-6">
            This QR code is not active or doesn&apos;t exist. Please check the QR
            code and try again.
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
  const bankAccount = primaryAccount || merchant.bankAccounts[0]

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col font-satoshi">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm">
        <Image
          src="/firespot_logo.svg"
          alt="Firespot"
          width={36}
          height={36}
        />
        <div className="flex-1">
          <p className="text-xs text-gray-500">Pay to</p>
          <p className="font-bold text-black">{merchant.businessName}</p>
        </div>
        {merchant.profilePhotoUrl && (
          <Image
            src={merchant.profilePhotoUrl}
            alt={merchant.businessName}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
        )}
      </header>

      <div className="flex-1 p-4 flex flex-col">
        {/* Merchant Info Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-3 mb-4">
            {merchant.profilePhotoUrl ? (
              <Image
                src={merchant.profilePhotoUrl}
                alt={merchant.businessName}
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#CED7E1] flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-500">
                  {merchant.businessName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg text-black">
                {merchant.businessName}
              </h1>
              <p className="text-gray-500 text-sm">Merchant</p>
            </div>
          </div>
        </div>

        {/* Bank Account Card */}
        {bankAccount && (
          <div className="bg-white rounded-2xl p-4 shadow-sm flex-1">
            <p className="text-gray-500 text-sm mb-3">Transfer to this account</p>

            <div className="flex items-center gap-3 mb-4">
              {renderBankLogo(bankAccount.bankName, 'lg')}
              <div>
                <p className="font-bold text-black">{bankAccount.bankName}</p>
                <p className="text-gray-500 text-sm">{bankAccount.accountName}</p>
              </div>
            </div>

            <div className="bg-[#F4F6F8] rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">Account Number</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-black tracking-wider">
                  {bankAccount.accountNumber}
                </p>
                <button
                  onClick={() => handleCopyAccountNumber(bankAccount.accountNumber)}
                  className="p-2 bg-white rounded-lg shadow-sm"
                >
                  {copiedAccount === bankAccount.accountNumber ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Show other accounts if available */}
            {merchant.bankAccounts.length > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-gray-500 text-xs mb-3">Other accounts</p>
                <div className="space-y-3">
                  {merchant.bankAccounts
                    .filter((acc) => acc.accountNumber !== bankAccount.accountNumber)
                    .map((acc) => (
                      <div
                        key={acc.accountNumber}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {renderBankLogo(acc.bankName)}
                          <div>
                            <p className="text-sm font-medium text-black">
                              {acc.bankName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {acc.accountNumber}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopyAccountNumber(acc.accountNumber)}
                          className="p-1.5"
                        >
                          {copiedAccount === acc.accountNumber ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 pb-6">
        <p className="text-center text-gray-400 text-xs">
          Powered by{' '}
          <Link href="/" className="text-black font-medium">
            Firespot
          </Link>
        </p>
      </div>
    </div>
  )
}
