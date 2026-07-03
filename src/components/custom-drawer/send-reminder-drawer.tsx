'use client'

import { useState, useMemo } from 'react'
import { Mail, Share, Link as LinkIcon, ChevronRight } from 'lucide-react'
import { Sale } from '@/services/sales/interface'
import { formatCurrency } from '@/lib/utils'
import {
  AppCard,
  CircularIconButton,
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
    if (sale.description && sale.description.startsWith('Sale for ')) {
      return sale.description.replace('Sale for ', '').trim()
    }
    return sale.description || 'Customer'
  }, [sale])

  const customerPhone = useMemo(() => {
    return (sale as any).customerPhone || (sale as any).phoneNumber || '0810 455 7865'
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
            <h2 className="text-[17px] font-bold text-black leading-tight">
              Send reminder
            </h2>
            <p className="text-xs text-[#8E8E93] font-medium">
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
          <AppCard padding="sm" rounded="16" className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <MerchantAvatar bankName={sale.targetBankName} size={42} />
              <div className="min-w-0">
                <h4 className="text-[14px] font-bold text-black truncate capitalize">
                  {customerName}
                </h4>
                <p className="text-xs font-medium text-gray-400 truncate">
                  {customerPhone}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0">
              <span className="text-[14px] font-bold text-black">
                NGN {formatCurrency(balanceOwed)}
              </span>
              <StatusBadge status="OUTSTANDING" />
            </div>
          </AppCard>

          {/* Message Draft Box */}
          <div className="bg-[#F8F9FA] rounded-[20px] p-4 border border-[#F1F1F1]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8E8E93] tracking-wider uppercase mb-3 pb-2 border-b border-gray-200/60">
              <Mail size={16} />
              <span>MESSAGE DRAFT</span>
            </div>

            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={4}
              className="w-full bg-transparent text-sm font-medium text-black outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Action Buttons: SMS, Share, Copy */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              type="button"
              onClick={handleSMS}
              className="flex flex-col items-center justify-center p-3.5 bg-[#F4F6F8] hover:bg-gray-200 active:bg-gray-300 rounded-[20px] transition-colors"
            >
              <Mail size={22} className="text-black mb-1.5" />
              <span className="text-xs font-bold text-black">SMS</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex flex-col items-center justify-center p-3.5 bg-[#F4F6F8] hover:bg-gray-200 active:bg-gray-300 rounded-[20px] transition-colors"
            >
              <Share size={22} className="text-black mb-1.5" />
              <span className="text-xs font-bold text-black">Share</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex flex-col items-center justify-center p-3.5 bg-[#F4F6F8] hover:bg-gray-200 active:bg-gray-300 rounded-[20px] transition-colors"
            >
              <LinkIcon size={22} className="text-black mb-1.5" />
              <span className="text-xs font-bold text-black">Copy</span>
            </button>
          </div>
        </div>
      </div>

      <TagFooter />
    </div>
  )
}
