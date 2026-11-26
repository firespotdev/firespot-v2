'use client'

import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { MerchantAvatar } from '@/components/layout'
import { formatCurrency } from '@/lib/utils'
import type { ReportSale } from '@/services/reports'

const saleStatus = (status: string) =>
  status === 'CONFIRMED'
    ? { label: 'Paid', className: 'text-[#24C166]' }
    : { label: 'Pending', className: 'text-[#B08A3E]' }

/** The sale being reported: shop, date, amount and where the payment stands. */
export function ReportSaleCard({
  sale,
  onOpen,
}: {
  sale: ReportSale
  onOpen?: () => void
}) {
  const status = saleStatus(sale.status)
  const shopName = sale.merchant.businessName || 'Shop'

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className="flex w-full items-center gap-2 rounded-[12px] bg-white px-3 py-2 text-left shadow-[0px_4px_8px_0px_#0000000A] border border-[#F4F6F8] disabled:cursor-default"
    >
      <MerchantAvatar
        profilePhotoUrl={sale.merchant.imageUrl}
        alt={shopName}
        size={48}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-black font-family-sofia-pro -tracking-[0.6px">
          {shopName}
        </p>
        <p className="text-[13px] text-[#00000080]">
          {format(new Date(sale.date), 'MMM d, yyyy')}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[15px] font-medium text-black font-family-sofia-pro -tracking-[0.6px]">
          ₦{formatCurrency(sale.amount)}
        </p>
        <p className={`text-[13px] ${status.className}`}>{status.label}</p>
      </div>
      {onOpen && <ChevronRight size={18} className="shrink-0 text-[#C4C4C4]" />}
    </button>
  )
}
