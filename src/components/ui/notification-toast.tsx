'use client'

import { toast } from 'sonner'
import { X, Check, type LucideIcon } from 'lucide-react'

interface NotificationToastProps {
  message: string
  icon?: LucideIcon
}

function NotificationToastContent({
  message,
  icon: Icon = Check,
  toastId,
}: NotificationToastProps & { toastId: string | number }) {
  return (
    <div className="flex items-center gap-3 w-fit">
      <div className="w-6 h-6 rounded-full bg-[#22C55E] flex items-center justify-center shrink-0">
        <Icon className="w-3 h-3 text-white" strokeWidth={2.5} />
      </div>

      <p className="flex-1 text-sm text-black font-medium whitespace-nowrap">{message}</p>

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
  duration = 3000,
}: NotificationToastProps & { duration?: number }) {
  return toast.custom(
    (id) => (
      <NotificationToastContent message={message} icon={icon} toastId={id} />
    ),
    {
      duration,
      unstyled: true,
      className:
        'bg-white rounded-full py-2 px-3 shadow-[0px_4px_12px_rgba(0,0,0,0.15)] border border-gray-100 w-fit mx-auto',
    },
  )
}
