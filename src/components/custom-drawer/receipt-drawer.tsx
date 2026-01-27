'use client'

import { useRef, useState } from 'react'
import { X, Check, Download } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {formatAmountInWords, formatDate} from '@/lib/utils/constants'
import { downloadElementAsPDF } from '@/lib/utils/pdf-download'
import { showNotificationToast } from '@/components/ui'

interface ReceiptDrawerProps {
  closeDrawer: () => void
  amount?: number
  paidBy?: string
  paidTo?: string
  referenceNumber?: string
  description?: string
  date?: string
}

export function ReceiptDrawer({
  closeDrawer,
  amount = 500,
  paidBy = 'Customer Name',
  paidTo = 'Firespot',
  referenceNumber = '0123456789',
  description = 'Payment',
  date,
}: ReceiptDrawerProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current || isDownloading) return

    setIsDownloading(true)
    try {
      await downloadElementAsPDF(receiptRef.current, {
        filename: `firespot-receipt-${referenceNumber}.pdf`,
        scale: 3,
        backgroundColor: '#F4F6F8',
      })
      showNotificationToast({
        message: 'Receipt downloaded successfully',
        duration: 2000,
      })
    } catch (error) {
      console.error('Failed to download receipt:', error)
      showNotificationToast({
        message: 'Failed to download receipt',
        duration: 2000,
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleShareReceipt = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Receipt',
          text: `Payment of ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} to ${paidTo}`,
        })
      } catch (error) {
        // User cancelled or share failed
      }
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#F4F6F8] font-satoshi">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-[#FFFFFF] mb-4">
        <div className="w-10" />
        <div className="w-10" />
        <button
          type="button"
          onClick={closeDrawer}
          className="flex items-center justify-center"
        >
          <X className="w-6 h-6 text-black" />
        </button>
      </header>

      <div className="flex-1 px-4 pb-4 overflow-auto">
        <div 
          ref={receiptRef}
          className="bg-white rounded-[6px] p-5 shadow-[0px_4.11px_8.21px_0px_#0000000A]"
        >
         
          <div className="flex items-start justify-between mb-6">
            <Image
              src="/icons/firespot_logo.svg"
              alt="Firespot"
              width={24}
              height={24}
            />
            <div className="text-right leading-none">
              <p className="text-[9px] font-bold text-[#0F172A] mb-1.5">Receipt</p>
              <p className="text-[8px] font-medium text-[#4C5563]">{formatDate(date)}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#0000000A] mb-6" />

          {/* Amount */}
          <div className="mb-4">
            <p className="text-2xl font-sofia-pro -tracking-[1.65px] font-medium text-black">
              ₦{amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-medium text-[#6B7280] mt-1 leading-none">
              {formatAmountInWords(amount)}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-3 h-3 bg-[#24C166] rounded-full flex items-center justify-center">
              <Check className="w-1.5 h-1.5 text-white" /></div>
              <span className="text-[10px] font-bold text-[#24C166]">Paid</span>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[10px] text-[#64748B] font-medium">Paid by</p>
              <p className="text-[11px] font-bold text-[#0F172A]">{paidBy}</p>
            </div>

            <div>
              <p className="text-[10px] text-[#64748B] font-medium">Paid to</p>
              <p className="text-[11px] font-bold text-[#0F172A]">{paidTo}</p>
            </div>

            <div>
              <p className="text-[10px] text-[#64748B] font-medium">Reference number</p>
              <p className="text-[11px] font-bold text-[#0F172A] break-all">
                {referenceNumber}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-[#64748B] font-medium">Description</p>
              <p className="text-[11px] font-bold text-[#0F172A]">{description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 pb-8">
        <Button
          onClick={handleDownloadReceipt}
          disabled={isDownloading}
          className="w-full flex items-center justify-center gap-2"
        >
          {isDownloading ? (
            'Generating...'
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download Receipt</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
