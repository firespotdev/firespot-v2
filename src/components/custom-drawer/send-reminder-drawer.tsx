'use client'

import { useState, useMemo } from 'react'
import { Mail, Share, Link as LinkIcon, ChevronRight } from 'lucide-react'
import { Sale } from '@/services/sales/interface'
import { formatCurrency } from '@/lib/utils'
import {
  AppCard,
  CircularIconButton,
  Label,
  StatusBadge,
  TagFooter,
  showNotificationToast,
} from '../ui'
import { MerchantAvatar } from '../layout/MerchantAvatar'

interface SendReminderDrawerProps {
  sale: Sale
  closeDrawer: () => void
}

export function SendReminderDrawer({
  sale,
  closeDrawer,
}: SendReminderDrawerProps) {
  const balanceOwed = useMemo(() => {
    if (!sale) return 0
    if (sale.balanceOwed !== undefined && sale.balanceOwed !== null) {
      return sale.balanceOwed
    }
    const paid = sale.amountPaid || 0
    return sale.amount ? Math.max(0, sale.amount - paid) : 0
  }, [sale])

  const customerName = useMemo(() => {
    if (!sale) return 'Customer'
    if (typeof sale.customerId === 'object' && sale.customerId) {
      if ((sale.customerId as any).name) return (sale.customerId as any).name
      if ((sale.customerId as any).businessName)
        return (sale.customerId as any).businessName
    }
    if (sale.customerName) return sale.customerName
    return 'Customer'
  }, [sale])

  const customerPhone = useMemo(() => {
    return (
      (sale as any).customerPhone ||
      (sale as any).phoneNumber ||
      '0810 455 7865'
    )
  }, [sale])

  const payLink = useMemo(() => {
    const ref = sale.reference || sale._id
    return `fs.co/pay/${ref?.slice(-6) || '8kd2'}`
  }, [sale])

  const initialDraft = `Hi ${customerName} 👋 Just a gentle reminder of your ₦${formatCurrency(
    balanceOwed,
  )} balance at Mummy Favour Stores. Whenever you're ready, you can pay here: ${payLink}`

  const [draftText, setDraftText] = useState(initialDraft)

  const handleSMS = () => {
    const cleanPhone = customerPhone.replace(/\s+/g, '')
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(draftText)}`
    window.open(smsUrl, '_blank')
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Payment Reminder',
        text: draftText,
      })
    } else {
      handleCopy()
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(draftText)
    showNotificationToast({
      message: 'Reminder message copied to clipboard',
    })
  }

  return (
    <div className="flex flex-col h-full font-satoshi justify-between">
      <div>
        {/* Header */}
        <header className="px-4 py-2 flex justify-between items-center relative w-full h-14 border-b border-gray-100">
          <div className="w-full text-center">
            <h2 className="text-[14px] font-bold text-black leading-tight">
              Send reminder
            </h2>
            <p className="text-xs text-[#6B7280] font-medium">
              Tap the message input box to edit
            </p>
          </div>

          <CircularIconButton
            icon="x"
            size="md"
            onClick={closeDrawer}
            className="absolute right-3 top-2.5"
          />
        </header>

        <div className="p-4 flex flex-col gap-4">
          {/* Customer Detail Card */}
          <AppCard
            padding="sm"
            rounded="16"
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <MerchantAvatar size={42} />
              <div className="min-w-0">
                <h4 className="text-[13px] font-bold text-[#111827]">
                  {customerName}
                </h4>
                <p className="text-xs font-medium text-[#6B7280]">
                  {customerPhone}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0">
              <span className="text-[13px] font-bold text-[#111827]">
                NGN {formatCurrency(balanceOwed)}
              </span>
              <StatusBadge status="OUTSTANDING" variant="text" />
            </div>
          </AppCard>

          {/* Message Draft Box */}
          <div className="space-y-1">
            <Label className="font-medium text-xs leading-none text-[#00000066]">
              Message draft
            </Label>
            <div className="bg-[#F4F4F4] rounded-[12px] p-3 relative min-h-27.5 overflow-hidden">
              {/* Formatted Backdrop with Blue Links */}
              <div
                className="absolute inset-0 p-3 pointer-events-none whitespace-pre-wrap wrap-break-word text-sm font-medium text-black leading-relaxed font-satoshi select-none"
                aria-hidden="true"
              >
                {(() => {
                  if (!draftText) return null
                  const urlRegex =
                    /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g
                  const parts = draftText.split(urlRegex)
                  return parts.map((part, idx) => {
                    if (
                      part.match(/^https?:\/\//) ||
                      part.match(/^www\./) ||
                      part.match(/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/)
                    ) {
                      return (
                        <span key={idx} className="text-[#0075FF]">
                          {part}
                        </span>
                      )
                    }
                    return <span key={idx}>{part}</span>
                  })
                })()}
                {draftText.endsWith('\n') && <br />}
              </div>

              {/* Transparent Input Textarea */}
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={4}
                className="w-full bg-transparent text-sm font-medium text-transparent caret-black outline-none resize-none leading-relaxed relative z-10 font-satoshi"
              />
            </div>
          </div>

          {/* Action Buttons: SMS, Share, Copy */}
          <div className="grid grid-cols-3 gap-3 -mx-4 px-4 pt-4 border-t border-[#F4F6F8]">
            <button
              type="button"
              onClick={handleSMS}
              className="flex flex-col items-center justify-center p-3.5 bg-[#F4F6F8] rounded-[12px] transition-colors"
            >
              <Mail size={16} className="text-black mb-2" />
              <span className="text-sm font-medium text-black">SMS</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex flex-col items-center justify-center p-3.5 bg-[#F4F6F8] rounded-[12px] transition-colors"
            >
              <Share size={16} className="text-black mb-2" />
              <span className="text-sm font-medium text-black">Share</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex flex-col items-center justify-center p-3.5 bg-[#F4F6F8] rounded-[12px] transition-colors"
            >
              <LinkIcon size={16} className="text-black mb-2" />
              <span className="text-sm font-medium text-black">Copy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
