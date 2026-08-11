'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Share, X } from 'lucide-react'
import { showNotificationToast } from '@/components/ui'
import type { MerchantProfile } from '@/services/qr/interface'
import type { PaymentRail } from '../custom-drawer/rail-picker-drawer'
import { PaymentCheckoutFooter } from './payment-checkout-footer'

type BankAccount = MerchantProfile['bankAccounts'][0]

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000]

interface SalePayAmountScreenProps {
  merchant: MerchantProfile
  account?: BankAccount
  onChangeAccount: () => void
  onChangePaymentMethod: () => void
  selectedRail?: PaymentRail
  onCopy: (amount: number, description: string) => void
  onPayInstantly: (amount: number, description: string) => void
  onShare: () => void
  onClose: () => void
  isSubmitting?: boolean
}

function formatInt(value: number): string {
  return value.toLocaleString('en-NG')
}

export function SalePayAmountScreen({
  merchant,
  account,
  onChangeAccount,
  onChangePaymentMethod,
  selectedRail = 'multiple',
  onCopy,
  onPayInstantly,
  onShare,
  onClose,
  isSubmitting = false,
}: SalePayAmountScreenProps) {
  const [amountDigits, setAmountDigits] = useState('')
  const [description, setDescription] = useState('')

  const amountValue = Number(amountDigits || '0')
  const displayAmount = amountDigits ? formatInt(Number(amountDigits)) : ''
  const accountName = account?.accountName || merchant.businessName
  const hasPaystackCollection = Boolean(merchant.hasPaystackCollection)

  const handleAction = () => {
    if (amountValue <= 0) {
      showNotificationToast({
        message: 'Enter an amount first',
        duration: 2000,
      })
      return
    }

    if (hasPaystackCollection && selectedRail === 'multiple') {
      onPayInstantly(amountValue, description.trim())
    } else {
      onCopy(amountValue, description.trim())
    }
  }

  return (
    <div className="h-dvh bg-white overflow-hidden">
      <div className="max-w-125 mx-auto h-full flex flex-col bg-[#F4F6F8]">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 shrink-0">
          <button
            type="button"
            onClick={onShare}
            aria-label="Share"
            className="h-9 w-9 bg-[#00000014] rounded-[12px] flex items-center justify-center"
          >
            <Share color="#868788" size={16} />
          </button>
          <h1 className="font-bold text-base text-black">Pay</h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 bg-[#00000014] rounded-[12px] flex items-center justify-center"
          >
            <X size={16} color="#868788" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 flex flex-col items-center justify-center">
          {/* Merchant identity */}
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-[#E9EDF1] border border-[#F1F1F1] overflow-hidden flex items-center justify-center shadow-[0px_4px_8px_0px_#0000000A]">
              {merchant.profilePhotoUrl ? (
                <Image
                  src={merchant.profilePhotoUrl}
                  alt={merchant.businessName || 'Merchant'}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Image
                  src="/icons/store_solid.svg"
                  width={32}
                  height={32}
                  alt="store"
                />
              )}
            </div>
            <h2 className="font-bold text-[20px] text-black -tracking-[0.4px] mt-4 uppercase">
              {accountName}
            </h2>
            <p className="text-sm text-[#00000080] font-medium mt-1">
              Typically confirms payments after a few minutes
            </p>
          </div>

          {/* Amount + description card */}
          <div className="w-full bg-white border border-[#E5E7EB] rounded-[12px] mt-4 shadow-[0px_4px_8px_0px_#0000000A]">
            <div className="p-4">
              <p className="text-xs text-[#64748B] font-medium">Enter amount</p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-baseline shrink-0 font-bold">
                  <span className="text-[32px] leading-none text-black">₦</span>
                  <input
                    inputMode="numeric"
                    value={displayAmount}
                    onChange={(e) =>
                      setAmountDigits(e.target.value.replace(/\D/g, ''))
                    }
                    placeholder="0"
                    className="w-28 text-[32px] leading-none text-black bg-transparent leading-none outline-none placeholder:text-[#9CA3AF]"
                  />
                </div>
                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide min-w-0 -mr-4">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmountDigits(String(value))}
                      className="shrink-0 last:mr-2 h-8 px-2 border border-[#F1F1F1] rounded-[6px] bg-[#F4F6F8] text-sm font-medium text-black flex items-center"
                    >
                      ₦ {formatInt(value)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-[#F1F1F1] p-4">
              <p className="text-xs text-[#00000080] font-medium">
                Description
              </p>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Payment for..."
                  className="flex-1 min-w-0 text-[20px] text-black bg-transparent outline-none placeholder:text-[#9CA3AF] font-bold"
                />
                <button
                  type="button"
                  onClick={() =>
                    showNotificationToast({
                      message: 'Coming soon',
                      duration: 2000,
                    })
                  }
                  className="shrink-0 h-8 px-2 rounded-[6px] border border-[#F1F1F1] bg-[#F4F6F8] text-sm font-medium text-black flex items-center gap-1"
                >
                  <Plus size={16} color="black" />
                  Select items
                </button>
              </div>
            </div>
          </div>
        </div>

        <PaymentCheckoutFooter
          merchant={merchant}
          account={account}
          selectedRail={selectedRail}
          qrType="static"
          onAction={handleAction}
          onChangeAccount={onChangeAccount}
          onChangePaymentMethod={onChangePaymentMethod}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}
