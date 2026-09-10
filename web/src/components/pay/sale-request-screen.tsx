'use client'

import Image from 'next/image'
import {
  ChevronDown,
  Share,
  X,
} from 'lucide-react'
import type { PublicSale } from '@/services/sales/interface'
import type { SavedCard } from '@/services/sales/interface'
import type { MerchantProfile } from '@/services/qr/interface'
import { formatAmount, formatSaleTime } from './utils'
import { useDrawerStore } from '@/services/drawer'
import type { PaymentRail } from '../custom-drawer/rail-picker-drawer'
import { PaymentCheckoutFooter } from './payment-checkout-footer'
import { getBusinessImageUrl } from '@/lib/utils/business-image'

type BankAccount = MerchantProfile['bankAccounts'][0]

interface SaleRequestScreenProps {
  sale: PublicSale
  merchant: MerchantProfile
  account?: BankAccount
  onChangeAccount: () => void
  onChangePaymentMethod: () => void
  selectedRail: PaymentRail
  onCopy: () => void
  onPayInstantly: () => void
  onShare: () => void
  onClose: () => void
  hasPaystackCollection?: boolean
  isSubmitting?: boolean
  savedCard?: SavedCard
}

export function SaleRequestScreen({
  sale,
  merchant,
  account,
  onChangeAccount,
  onChangePaymentMethod,
  selectedRail,
  onCopy,
  onPayInstantly,
  onShare,
  onClose,
  hasPaystackCollection = false,
  isSubmitting = false,
  savedCard,
}: SaleRequestScreenProps) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const items = sale.items || []
  const itemsCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0)
  const accountName = account?.accountName || merchant.businessName
  const merchantName =
    sale.merchant?.businessName || merchant.businessName || accountName
  const businessImageUrl = getBusinessImageUrl(merchant)

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
            {businessImageUrl ? (
              <Image
                src={businessImageUrl}
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
          {merchantName && (
            <p className="text-sm text-[#00000080] font-medium mt-1">
              Request from {merchantName}
            </p>
          )}

          <p className="font-medium text-black font-sofia-pro text-[60px] leading-none -tracking-[4px] mt-5">
            ₦{formatAmount(sale.amount)}
          </p>

          <p className="text-lg text-[#00000080] mt-5">
            {itemsCount > 0 && (
              <>
                <button
                  onClick={() =>
                    openDrawer({
                      type: 'sale-items',
                      props: { items },
                    })
                  }
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

          <p className="text-sm font-medium text-[#00000066]">
            {formatSaleTime(sale.createdAt)}
          </p>
        </div>

        <PaymentCheckoutFooter
          merchant={{ ...merchant, hasPaystackCollection }}
          account={account}
          selectedRail={selectedRail}
          qrType="dynamic"
          onAction={
            selectedRail === 'multiple' || selectedRail === 'saved'
              ? onPayInstantly
              : onCopy
          }
          onChangeAccount={onChangeAccount}
          onChangePaymentMethod={onChangePaymentMethod}
          savedCard={savedCard}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}
