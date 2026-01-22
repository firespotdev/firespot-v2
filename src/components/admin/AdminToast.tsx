'use client'

import { toast } from 'sonner'
import { Check, AlertTriangle, XCircle } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'warning'

interface AdminToastContentProps {
  message: string
  variant: ToastVariant
  toastId: string | number
}

function AdminToastContent({
  message,
  variant,
  toastId,
}: AdminToastContentProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'error':
        return {
          bgColor: 'bg-red-500',
          Icon: XCircle,
        }
      case 'warning':
        return {
          bgColor: 'bg-amber-500',
          Icon: AlertTriangle,
        }
      case 'success':
      default:
        return {
          bgColor: 'bg-emerald-500',
          Icon: Check,
        }
    }
  }

  const { bgColor, Icon } = getVariantStyles()

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-7 h-7 rounded-full ${bgColor} flex items-center justify-center shrink-0`}
      >
        <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
      </div>

      <p className="flex-1 text-sm text-gray-900 font-medium">{message}</p>

      <button
        type="button"
        onClick={() => toast.dismiss(toastId)}
        className="shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  )
}

function showAdminToast(message: string, variant: ToastVariant, duration = 4000) {
  return toast.custom(
    (id) => (
      <AdminToastContent message={message} variant={variant} toastId={id} />
    ),
    {
      duration,
      unstyled: true,
      className:
        'bg-white rounded-xl py-3 px-4 shadow-lg border border-gray-100 min-w-[300px]',
    },
  )
}

export const adminToast = {
  success: (message: string, duration?: number) =>
    showAdminToast(message, 'success', duration),
  error: (message: string, duration?: number) =>
    showAdminToast(message, 'error', duration),
  warning: (message: string, duration?: number) =>
    showAdminToast(message, 'warning', duration),
}
