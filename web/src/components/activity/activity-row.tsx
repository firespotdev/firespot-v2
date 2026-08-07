'use client'

import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { VerifiedBadge } from '@/components/ui'
import { MerchantAvatar } from '@/components/layout'
import type { CustomerSale } from '@/services/sales/interface'
import {
  resolveSaleMerchant,
  saleActivitySubtitle,
} from '@/lib/utils/customer-sale'
import { formatCurrency } from '@/lib/utils'

interface ActivityRowProps {
  sale: CustomerSale
  onOpen: (sale: CustomerSale) => void
}

export function ActivityRow({ sale, onOpen }: ActivityRowProps) {
  const merchant = resolveSaleMerchant(sale)
  const businessName = merchant.businessName || 'Merchant'
  const subtitle = saleActivitySubtitle(sale)
  const isComment = subtitle?.toLowerCase().includes('comment')
  const isEnquiry = subtitle?.toLowerCase().includes('enquiry')
  const isFollow = subtitle?.toLowerCase().includes('follow')

  return (
    <button
      type="button"
      onClick={() => onOpen(sale)}
      className="w-full flex items-center gap-3 text-left"
    >
      <MerchantAvatar profilePhotoUrl={merchant.profilePhotoUrl} size={48} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-[14px] font-bold text-black truncate">
            {businessName}
          </p>
          <VerifiedBadge level="PROMAX" />
        </div>
        <p className="text-xs font-medium text-[#00000066] truncate mt-0.5">
          {subtitle}
        </p>
      </div>

      {isComment ? (
        <div className="w-12 h-12 rounded-[8px] overflow-hidden bg-gray-100 shrink-0 border border-[#F1F1F1]">
          <Image
            src="/images/default_avatar.png"
            alt=""
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        </div>
      ) : isEnquiry || isFollow ? (
        <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="text-right">
            <p className="text-[14px] font-bold text-black">
              ₦{formatCurrency(sale.amount || 0)}
            </p>
            <p className="text-xs font-medium text-[#24C166] mt-0.5">Paid</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
        </div>
      )}
    </button>
  )
}
