'use client'

import { toast } from 'sonner'
import { X, Check, FileText, type LucideIcon } from 'lucide-react'
import { MerchantAvatar } from '../layout/MerchantAvatar'
import { Button } from './button'

interface NotificationToastProps {
  message: string
  icon?: LucideIcon
  mode?: 'success' | 'info' | 'error'
}

function NotificationToastContent({
  message,
  icon,
  mode = 'info',
  toastId,
}: NotificationToastProps & { toastId: string | number }) {
  const Icon = icon || (mode === 'success' ? Check : mode === 'error' ? X : null)

  return (
    <div className="flex items-center gap-3 w-fit">
      {Icon && (
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
            mode === 'success'
              ? 'bg-[#22C55E]'
              : mode === 'error'
                ? 'bg-[#EF4444]'
                : 'bg-[#6B7280]'
          }`}
        >
          <Icon className="w-3 h-3 text-white" strokeWidth={2.5} />
        </div>
      )}

      <p className="flex-1 text-sm text-black font-medium whitespace-nowrap">
        {message}
      </p>

      <button
        type="button"
        onClick={() => toast.dismiss(toastId)}
        className="shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function showNotificationToast({
  message,
  icon,
  mode = 'info',
  duration = 3000,
}: NotificationToastProps & { duration?: number }) {
  return toast.custom(
    (id) => (
      <NotificationToastContent
        message={message}
        icon={icon}
        mode={mode}
        toastId={id}
      />
    ),
    {
      duration,
      unstyled: true,
      className:
        'bg-white rounded-full py-2 px-3 shadow-[0px_4px_12px_rgba(0,0,0,0.15)] border border-gray-100 w-fit mx-auto',
    },
  )
}

/**
 * Rich toast for a customer-initiated payment. Tapping the check opens the
 * merchant's collect drawer (its confirm view); the X dismisses the toast.
 */
export function showNewPaymentToast({
  time,
  onView,
  duration = 8000,
}: {
  time: string
  onView: () => void
  duration?: number
}) {
  return toast.custom(
    (id) => (
      <div className="w-full flex items-center gap-3 bg-white rounded-[12px] py-3 px-4 shadow-[0px_4px_16px_rgba(0,0,0,0.12)]">
        <MerchantAvatar size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-black leading-tight truncate">
            New payment from customer
          </p>
          <p className="text-[13px] text-[#00000066] font-medium mt-0.5">
            {time}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          aria-label="Dismiss"
          className="w-10 h-10 rounded-full bg-[#0000000A] border border-[#0000000A] flex items-center justify-center shrink-0"
        >
          <X size={20} color="black" />
        </button>
        <button
          type="button"
          onClick={() => {
            onView()
            toast.dismiss(id)
          }}
          aria-label="Review payment"
          className="w-10 h-10 rounded-full bg-[#24C166] border border-[#0000000A] flex items-center justify-center shrink-0"
        >
          <Check size={20} color="white" strokeWidth={2.5} />
        </button>
      </div>
    ),
    {
      duration,
      unstyled: true,
      className: 'w-full max-w-[420px] mx-auto',
    },
  )
}

/**
 * Rich toast for a customer-uploaded receipt. VIEW opens the collect drawer
 * (its receipt view).
 */
export function showReceiptUploadedToast({
  onView,
  duration = 8000,
}: {
  onView: () => void
  duration?: number
}) {
  return toast.custom(
    (id) => (
      <div className="w-full bg-white shadow-[0px_4px_8px_0px_#0000000A] border-[3px] border-[#24C1664D] rounded-[12px] p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FileText size={20} color="#24C166" />
          <div className="text-left">
            <h4 className="text-[13px] font-medium text-[#000000]">
              Customer uploaded receipt
            </h4>
          </div>
        </div>
        <Button
          onClick={() => {
            onView()
            toast.dismiss(id)
          }}
          className="w-fit bg-[#0000000A] shadow-[0px_2px_4px_0px_#0000000A] border border-[#0000000A] rounded-4xl px-3 h-8,5 text-black text-[10px] tracking-[1px] font-bold"
        >
          VIEW
        </Button>
      </div>
    ),
    {
      duration,
      unstyled: true,
      className: 'w-full max-w-[420px] mx-auto',
    },
  )
}
