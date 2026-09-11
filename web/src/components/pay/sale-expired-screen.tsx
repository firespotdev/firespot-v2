'use client'

import Image from 'next/image'
import { X, Clock } from 'lucide-react'
import type { MerchantProfile } from '@/services/qr/interface'
import { getBusinessImageUrl } from '@/lib/utils/business-image'
import { Button } from '@/components/ui/button'

interface SaleExpiredScreenProps {
  serialNumber: string
  merchant: MerchantProfile
  onPayDirectly: () => void
  onClose: () => void
}

export function SaleExpiredScreen({
  merchant,
  onPayDirectly,
  onClose,
}: SaleExpiredScreenProps) {
  const businessImageUrl = getBusinessImageUrl(merchant)
  const merchantName = merchant.businessName || 'Merchant'

  return (
    <div className="h-dvh bg-white overflow-hidden font-satoshi">
      <div className="max-w-125 mx-auto h-full flex flex-col bg-[#F4F6F8]">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 shrink-0">
          <div className="w-9 h-9" />
          <h1 className="font-bold text-base text-black">Sale Expired</h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 bg-[#00000014] rounded-[12px] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          >
            <X size={16} color="#868788" />
          </button>
        </header>

        {/* Expired content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col items-center justify-center text-center py-6">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-[#E9EDF1] border border-[#F1F1F1] overflow-hidden flex items-center justify-center">
              {businessImageUrl ? (
                <Image
                  src={businessImageUrl}
                  alt={merchantName}
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
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#FFF0F0] border-2 border-white flex items-center justify-center shadow-xs">
              <Clock size={16} className="text-[#FF3B30]" />
            </div>
          </div>

          <h2 className="font-bold text-[22px] text-black tracking-[-0.4px] leading-tight">
            This sale has expired
          </h2>
          <p className="text-sm text-[#00000080] font-medium mt-2 max-w-[280px] leading-relaxed">
            This payment request was valid until midnight and is no longer active. You can pay {merchantName} directly.
          </p>
        </div>

        {/* Footer actions */}
        <div className="p-4 shrink-0 bg-[#F4F6F8]">
          <Button
            type="button"
            onClick={onPayDirectly}
            className="w-full h-12 rounded-[14px] bg-black text-white font-semibold text-base hover:bg-black/90 transition-colors shadow-sm"
          >
            Pay Vendor Directly
          </Button>
        </div>
      </div>
    </div>
  )
}
