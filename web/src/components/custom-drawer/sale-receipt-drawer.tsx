'use client'

import { Share, Download, Copy, Check } from 'lucide-react'
import { Button, TagFooter, CircularIconButton } from '../ui'
import { format } from 'date-fns'
import { showNotificationToast } from '@/components/ui'
import type { PublicSale } from '@/services/sales/interface'
import type { MerchantProfile } from '@/services/qr/interface'
import { formatCurrency } from '@/lib/utils'
import { getSaleDescription } from '@/lib/utils/sales'

interface SaleReceiptDrawerProps {
  sale: PublicSale
  merchant: MerchantProfile
  closeDrawer: () => void
}

export function SaleReceiptDrawer({
  sale,
  merchant,
  closeDrawer,
}: SaleReceiptDrawerProps) {
  if (!sale) return null

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A'
    try {
      return format(new Date(date), 'MMMM do, yyyy . h:mm a')
    } catch (e) {
      return String(date)
    }
  }

  const merchantName =
    sale.merchant?.businessName || merchant.businessName || 'Merchant'
  const paidTo = sale.targetBankName || merchantName

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Firespot Receipt',
          text: `Receipt for payment of NGN ${formatCurrency(sale.amount || 0)} to ${merchantName} on ${formatDate(
            sale.recordedAt || sale.createdAt,
          )}`,
          url: window.location.href,
        })
        .catch(() => {})
    }
  }

  return (
    <div className="flex flex-col h-full font-satoshi bg-white">
      {/* Header */}
      <div className="shrink-0 p-3 text-black border-b border-[#f1f1f1] w-full text-center flex justify-between items-center bg-white">
        <CircularIconButton icon="arrow-left" size="sm" onClick={closeDrawer} />
        <h2 className="text-base font-bold">Transaction details</h2>
        <span className="w-7 h-7 shrink-0" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center pt-8 px-4">
          {/* Status Icon Ring */}
          <div className="w-16 h-16 rounded-full border-4 border-[#24C166] flex items-center justify-center mb-4 bg-white shrink-0">
            <Check className="text-[#24C166]" size={32} strokeWidth={3} />
          </div>

          {/* Amount and Status Message */}
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5 flex-wrap">
              <h3 className="text-[20px] font-bold text-black -tracking-[0.4px] leading-none">
                NGN {formatCurrency(sale.amount || 0)}
              </h3>
            </div>
            <p className="text-[14px] text-[#898A8D] font-medium">
              Payment successful
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center mb-6 w-full">
            <Button
              variant="outline"
              className="w-fit rounded-full h-9 bg-[#F1F1F1] border-none px-3.5 text-[10px] font-bold text-black tracking-[1px] hover:bg-[#F1F1F1]/80 transition-colors flex items-center justify-center gap-1.5"
              onClick={handleShare}
            >
              <Share size={16} className="text-black" />
              SHARE RECEIPT
            </Button>
            <Button
              variant="outline"
              className="w-fit rounded-full h-9 bg-[#F1F1F1] border-none px-3.5 text-[10px] font-bold text-black tracking-[1px] hover:bg-[#F1F1F1]/80 transition-colors flex items-center justify-center gap-1.5"
              onClick={() => window.print()}
            >
              <Download size={16} className="text-black" />
              DOWNLOAD RECEIPT
            </Button>
          </div>

          {/* First Details Card Section */}
          <div className="w-full border border-[#F1F1F1] rounded-[12px] bg-white p-5 space-y-4">
            {/* Status */}
            <div className="flex justify-between items-center border-b border-[#F1F1F1] pb-4">
              <span className="text-[14px] text-[#00000080] font-normal">
                Status
              </span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full flex items-center justify-center bg-[#24C166]">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3.5px]" />
                </div>
                <span className="text-[14px] font-medium text-[#24C166]">
                  Paid
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Amount
              </span>
              <span className="text-[14px] font-medium text-black">
                NGN {formatCurrency(sale.amount || 0)}
              </span>
            </div>

            {/* Description */}
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Description
              </span>
              <span className="text-[14px] font-medium text-black truncate max-w-50 capitalize">
                {getSaleDescription(sale, 'No description')}
              </span>
            </div>
          </div>

          {/* Second Details Section with Border */}
          <div className="w-full border border-[#F1F1F1] rounded-[12px] bg-white p-5 space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Paid to
              </span>
              <span className="text-[14px] font-medium text-black truncate max-w-50">
                {paidTo}
              </span>
            </div>

            {/* Date and time */}
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Date and time
              </span>
              <span className="text-[14px] font-medium text-black">
                {formatDate(sale.recordedAt || sale.createdAt)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Via
              </span>
              <span className="text-[14px] font-medium text-black">
                {sale.serialNumber || 'N/A'}
              </span>
            </div>

            {/* Payment method */}
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Payment method
              </span>
              <span className="text-[14px] font-medium text-black">
                {sale.paymentMethod || 'Bank Transfer'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Reference
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-black truncate max-w-37.5">
                  {sale.reference || 'N/A'}
                </span>
                <button
                  onClick={() => {
                    if (sale.reference) {
                      navigator.clipboard.writeText(sale.reference)
                      showNotificationToast({
                        message: 'Reference copied',
                        mode: 'success',
                        duration: 1500,
                      })
                    }
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <Copy size={16} className="text-[#9CA3AF]" />
                </button>
              </div>
            </div>
          </div>

          <TagFooter />
        </div>
      </div>
    </div>
  )
}
