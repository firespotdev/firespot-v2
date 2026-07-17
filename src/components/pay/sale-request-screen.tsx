'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronDown, Share, Store, X } from 'lucide-react'
import { Button, TagFooter } from '@/components/ui'
import { BankLogo } from '@/components/ui/bank-logo'
import type { PublicSale } from '@/services/sales/interface'
import type { MerchantProfile } from '@/services/qr/interface'
import { formatAmount, formatSaleTime } from './utils'
import { PageHeader } from '../layout/PageHeader'

type BankAccount = MerchantProfile['bankAccounts'][0]

interface SaleRequestScreenProps {
  sale: PublicSale
  merchant: MerchantProfile
  account?: BankAccount
  onChangeAccount: () => void
  onCopy: () => void
  onShare: () => void
  onClose: () => void
}

export function SaleRequestScreen({
  sale,
  merchant,
  account,
  onChangeAccount,
  onCopy,
  onShare,
  onClose,
}: SaleRequestScreenProps) {
  const [itemsExpanded, setItemsExpanded] = useState(false)

  const items = sale.items || []
  const itemsCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0)
  const accountName = account?.accountName || merchant.businessName
  const slug = sale.merchant?.merchantSlug || merchant.merchantSlug

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

        {/* Request details */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 flex flex-col items-center justify-center text-center py-6">
          <div className="w-24 h-24 rounded-full bg-[#E9EDF1] border border-[#F1F1F1] overflow-hidden flex items-center justify-center">
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
          {slug && (
            <p className="text-sm text-[#00000080] font-medium mt-1">
              Request from @{slug}
            </p>
          )}

          <p className="font-medium text-black font-sofia-pro text-[60px] leading-none -tracking-[4px] mt-5">
            ₦{formatAmount(sale.amount)}
          </p>

          <p className="text-lg text-[#00000080] mt-5">
            {itemsCount > 0 && (
              <>
                <button
                  onClick={() => setItemsExpanded((v) => !v)}
                  className="flex items-center gap-px text-sm text-[#00000080] mb-2 font-medium hover:opacity-85"
                >
                  <span className="mr-1">For</span>
                  <span className="underline underline-offset-3 text-black">
                    {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                  </span>
                  <ChevronDown
                    strokeWidth={2}
                    size={14}
                    color="black"
                    className="mt-[1.5%]"
                  />
                  {sale.location && (
                    <span className="ml-1">at {sale.location}</span>
                  )}
                </button>
              </>
            )}
          </p>

          {itemsExpanded && items.length > 0 && (
            <div className="mt-3 w-full max-w-80 bg-white border border-[#F1F1F1] rounded-2xl divide-y divide-[#F1F1F1] text-left">
              {items.map((item, index) => (
                <div
                  key={`${item.productName}-${index}`}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <span className="text-sm text-black">
                    {item.productName || 'Item'}
                    {item.quantity && item.quantity > 1
                      ? ` × ${item.quantity}`
                      : ''}
                  </span>
                  {typeof item.price === 'number' && (
                    <span className="text-sm text-[#00000080]">
                      ₦{formatAmount(item.price * (item.quantity || 1))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-sm font-medium text-[#00000066]">
            {formatSaleTime(sale.createdAt)}
          </p>
        </div>

        {/* Bottom card */}
        <div className="shrink-0 bg-white rounded-t-[12px] border-t border-[#F1F1F1] px-4 pt-4 pb-2">
          {account && (
            <div className="flex items-center gap-3 mb-4">
              <BankLogo
                bankName={account.bankName}
                size={24}
                className="rounded-[6px] border border-[#f4f6f8]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#64748B]">Transfer to</p>
                <p className="font-bold text-sm text-[#0F172A] truncate">
                  {account.bankName} ({account.accountNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={onChangeAccount}
                className="bg-[#F1F1F1] rounded-full h-9 px-4 text-[10px] font-bold tracking-[1px] text-black uppercase shrink-0"
              >
                Change
              </button>
            </div>
          )}

          <Button onClick={onCopy}>Copy account number</Button>

          <TagFooter className="py-4" />
        </div>
      </div>
    </div>
  )
}
