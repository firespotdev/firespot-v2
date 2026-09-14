'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X, Check, FileText, Loader2, type LucideIcon } from 'lucide-react'
import { MerchantAvatar } from '../layout/MerchantAvatar'
import { Button } from './button'

interface NotificationToastProps {
  message: string
  icon?: LucideIcon
  mode?: 'success' | 'info' | 'error'
  onDismiss?: () => void
}

function NotificationToastContent({
  message,
  icon,
  mode = 'info',
  toastId,
  onDismiss,
}: NotificationToastProps & { toastId: string | number }) {
  const [isDismissed, setIsDismissed] = useState(false)
  const Icon =
    icon || (mode === 'success' ? Check : mode === 'error' ? X : null)

  const dismissNotification = () => {
    setIsDismissed(true)
    onDismiss?.()
    // Let React remove the visible card first. Sonner then cleans up its
    // positioning wrapper without controlling whether the card disappears.
    window.setTimeout(() => toast.dismiss(toastId), 0)
  }

  if (isDismissed) return null

  return (
    <div className="firespot-notification-content flex min-w-0 items-center gap-2 rounded-[20px] border border-[#DFDFDF] bg-white p-1.5 shadow-[0px_4px_8px_rgba(0,0,0,0.04)]">
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

      <p className="firespot-notification-message min-w-0 flex-1 text-pretty text-[13px] font-medium leading-[120%] text-black">
        {message}
      </p>

      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
          dismissNotification()
        }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          dismissNotification()
        }}
        aria-label="Dismiss notification"
        className="relative z-10 flex size-6 shrink-0 cursor-pointer items-center justify-end pl-1 pointer-events-auto"
      >
        <X size={16} color="#4C5563" />
      </button>
    </div>
  )
}

export function showNotificationToast({
  message,
  icon,
  mode = 'info',
  duration,
  toastId,
  onDismiss,
}: NotificationToastProps & {
  duration?: number
  toastId?: string | number
}) {
  const resolvedDuration = duration ?? (message.length > 80 ? 6000 : 3000)

  return toast.custom(
    (id) => (
      <NotificationToastContent
        message={message}
        icon={icon}
        mode={mode}
        toastId={id}
        onDismiss={onDismiss}
      />
    ),
    {
      id: toastId,
      duration: resolvedDuration,
      unstyled: true,
      className: 'firespot-notification-toast mx-auto',
    },
  )
}

interface NewPaymentToastContentProps {
  message: string
  time: string
  profilePhotoUrl?: string
  toastId: string | number
  onConfirm: () => Promise<void>
  onArchive: () => Promise<void>
}

function NewPaymentToastContent({
  message,
  time,
  profilePhotoUrl,
  toastId,
  onConfirm,
  onArchive,
}: NewPaymentToastContentProps) {
  const [pendingAction, setPendingAction] = useState<
    'confirm' | 'archive' | null
  >(null)

  const runAction = async (
    action: 'confirm' | 'archive',
    callback: () => Promise<void>,
  ) => {
    if (pendingAction) return
    setPendingAction(action)
    try {
      await callback()
      toast.dismiss(toastId)
    } catch {
      setPendingAction(null)
    }
  }

  return (
    <div className="w-full flex items-center gap-3 bg-white rounded-[12px] py-3 px-4 shadow-[0px_4px_16px_rgba(0,0,0,0.12)]">
      <MerchantAvatar
        profilePhotoUrl={profilePhotoUrl}
        alt="Customer"
        size={36}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-black leading-tight truncate">
          {message}
        </p>
        <p className="text-[13px] text-[#00000066] font-medium mt-0.5">
          {time}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void runAction('archive', onArchive)}
        disabled={Boolean(pendingAction)}
        aria-label="Archive payment"
        className="w-10 h-10 rounded-full bg-[#0000000A] border border-[#0000000A] flex items-center justify-center shrink-0 disabled:opacity-50"
      >
        {pendingAction === 'archive' ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <X size={20} color="black" />
        )}
      </button>
      <button
        type="button"
        onClick={() => void runAction('confirm', onConfirm)}
        disabled={Boolean(pendingAction)}
        aria-label="Confirm payment"
        className="w-10 h-10 rounded-full bg-[#24C166] border border-[#0000000A] flex items-center justify-center shrink-0 disabled:opacity-50"
      >
        {pendingAction === 'confirm' ? (
          <Loader2 size={20} className="animate-spin text-white" />
        ) : (
          <Check size={20} color="white" strokeWidth={2.5} />
        )}
      </button>
    </div>
  )
}

/** Rich toast whose X archives and whose checkmark confirms the pending sale. */
export function showNewPaymentToast({
  message = 'New payment from customer',
  time,
  profilePhotoUrl,
  onConfirm,
  onArchive,
  duration = 8000,
  toastId,
}: {
  message?: string
  time: string
  profilePhotoUrl?: string
  onConfirm: () => Promise<void>
  onArchive: () => Promise<void>
  duration?: number
  toastId?: string | number
}) {
  return toast.custom(
    (id) => (
      <NewPaymentToastContent
        message={message}
        time={time}
        profilePhotoUrl={profilePhotoUrl}
        toastId={id}
        onConfirm={onConfirm}
        onArchive={onArchive}
      />
    ),
    {
      id: toastId,
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
