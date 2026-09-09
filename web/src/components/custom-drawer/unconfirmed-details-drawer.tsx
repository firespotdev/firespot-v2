'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Info,
  Check,
  User,
  ShoppingBag,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import Image from 'next/image'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { showNotificationToast, TagFooter } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import {
  useConfirmSale,
  useArchiveSale,
  useInfiniteSales,
} from '@/services/sales/hooks'
import type { Sale } from '@/services/sales/interface'

interface UnconfirmedDetailsDrawerProps {
  sales?: Sale[]
  initialIndex?: number
  onConfirmSuccess?: (saleId: string) => void
  onArchiveSuccess?: (saleId: string) => void
}

export function UnconfirmedDetailsDrawer({
  sales: initialSales,
  initialIndex = 0,
  onConfirmSuccess,
  onArchiveSuccess,
}: UnconfirmedDetailsDrawerProps) {
  const { closeDrawer } = useDrawerStore()
  const pendingQuery = useInfiniteSales({ status: 'PENDING' })

  // If sales prop is provided use it, otherwise flatten from pendingQuery
  const salesList = useMemo(() => {
    if (initialSales && initialSales.length > 0) return initialSales
    return pendingQuery.data?.pages.flatMap((page) => page.data) || []
  }, [initialSales, pendingQuery.data])

  const [activeSales, setActiveSales] = useState<Sale[]>(salesList)
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(initialIndex, Math.max(0, salesList.length - 1)),
  )
  const [confirmedSaleIds, setConfirmedSaleIds] = useState<Record<string, boolean>>({})

  const confirmSaleMutation = useConfirmSale()
  const archiveSaleMutation = useArchiveSale()

  // Current active sale
  const currentSale = activeSales[currentIndex]

  // If no sales left
  if (!currentSale || activeSales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-t-3xl min-h-[320px] text-center font-satoshi">
        <div className="w-12 h-12 rounded-full bg-[#E9F6EC] flex items-center justify-center text-[#24C166] mb-3">
          <Check size={28} strokeWidth={3} />
        </div>
        <h3 className="font-bold text-lg text-black">You're all caught up!</h3>
        <p className="text-sm text-[#757575] mt-1 max-w-[260px]">
          No more unconfirmed sales to review at the moment.
        </p>
        <button
          type="button"
          onClick={() => closeDrawer()}
          className="mt-6 px-6 py-2.5 rounded-full bg-black text-white font-bold text-sm"
        >
          Close
        </button>
      </div>
    )
  }

  const isConfirmed = !!confirmedSaleIds[currentSale._id] || currentSale.status === 'CONFIRMED'

  const formattedDate = (() => {
    const raw = currentSale.recordedAt || currentSale.createdAt
    if (!raw) return 'N/A'
    try {
      return format(new Date(raw), 'MMMM do, yyyy · h:mm a')
    } catch {
      return String(raw)
    }
  })()

  const customerName = (() => {
    if (typeof currentSale.customerId === 'object' && currentSale.customerId?.name) {
      return currentSale.customerId.name
    }
    if (currentSale.customerName) {
      return currentSale.customerName
    }
    return 'New customer'
  })()

  const customerPhone = (() => {
    if (typeof currentSale.customerId === 'object' && currentSale.customerId?.phoneNumber) {
      return currentSale.customerId.phoneNumber
    }
    return currentSale.customerPhone || ''
  })()

  const customerVisits = currentSale.customerPurchaseCount || 1
  const isRepeatCustomer =
    currentSale.customerType === 'Repeat' || customerVisits > 1

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      showNotificationToast({
        message: `${label} copied`,
        mode: 'success',
      })
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < activeSales.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handleConfirm = () => {
    if (confirmSaleMutation.isPending) return
    const saleId = currentSale._id

    confirmSaleMutation.mutate(saleId, {
      onSuccess: () => {
        setConfirmedSaleIds((prev) => ({ ...prev, [saleId]: true }))
        onConfirmSuccess?.(saleId)
        showNotificationToast({
          message: 'Payment confirmed',
          mode: 'success',
        })

        // Auto advance after 900ms or stay if last
        setTimeout(() => {
          setActiveSales((prevList) => {
            const nextList = prevList.filter((s) => s._id !== saleId)
            if (nextList.length === 0) {
              closeDrawer()
              return []
            }
            if (currentIndex >= nextList.length) {
              setCurrentIndex(nextList.length - 1)
            }
            return nextList
          })
        }, 800)
      },
      onError: () => {
        showNotificationToast({
          message: 'Failed to confirm payment',
          mode: 'error',
        })
      },
    })
  }

  const handleCancelSale = () => {
    if (archiveSaleMutation.isPending) return
    const saleId = currentSale._id

    archiveSaleMutation.mutate(saleId, {
      onSuccess: () => {
        onArchiveSuccess?.(saleId)
        showNotificationToast({
          message: 'Sale cancelled and archived',
          mode: 'success',
        })

        setActiveSales((prevList) => {
          const nextList = prevList.filter((s) => s._id !== saleId)
          if (nextList.length === 0) {
            closeDrawer()
            return []
          }
          if (currentIndex >= nextList.length) {
            setCurrentIndex(nextList.length - 1)
          }
          return nextList
        })
      },
      onError: () => {
        showNotificationToast({
          message: 'Failed to cancel sale',
          mode: 'error',
        })
      },
    })
  }

  const handleUndo = () => {
    setConfirmedSaleIds((prev) => {
      const copy = { ...prev }
      delete copy[currentSale._id]
      return copy
    })
  }

  return (
    <div className="flex flex-col bg-white rounded-t-3xl max-h-[85dvh] font-satoshi text-black">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#F1F1F1] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-full bg-[#E5E7EB] flex items-center justify-center text-gray-600 font-bold text-xs overflow-hidden">
            {typeof currentSale.customerId === 'object' &&
            currentSale.customerId?.profilePhotoUrl ? (
              <Image
                src={currentSale.customerId.profilePhotoUrl}
                alt={customerName}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{customerName.charAt(0).toUpperCase()}</span>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#24C166] rounded-full border border-white" />
          </div>

          <div className="flex flex-col">
            <h2 className="text-[15px] font-bold text-black leading-tight">
              {currentSale.source === 'QR scan'
                ? 'From QR kit scan'
                : customerName}
            </h2>
            <p className="text-[12px] text-[#757575] font-medium leading-none mt-0.5">
              {currentIndex + 1} of {activeSales.length}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => closeDrawer()}
          aria-label="Close"
          className="w-9 h-9 flex items-center justify-center -mr-1 text-black"
        >
          <X size={22} />
        </button>
      </header>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Amount & Navigation Bar */}
        <div className="flex items-center justify-between gap-2 py-2">
          {/* Left Arrow with large hit target */}
          <button
            type="button"
            aria-label="Previous sale"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="w-11 h-11 shrink-0 rounded-full bg-[#F3F4F6] hover:bg-gray-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black transition-all"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>

          {/* Amount & Status Center */}
          <div className="flex flex-col items-center justify-center text-center flex-1 min-w-0">
            {isConfirmed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E9F6EC] text-[#24C166] border border-[#24C1664D]">
                <span className="w-2 h-2 rounded-full bg-[#24C166]" />
                Confirmed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF9EB] text-[#BB8123] border border-[#FDE68A]">
                <span className="w-2 h-2 rounded-full bg-[#BB8123]" />
                Unconfirmed
              </span>
            )}

            <h1 className="text-[32px] font-bold text-black tracking-tight mt-1.5 leading-none">
              ₦ {formatCurrency(currentSale.amount || 0)}
            </h1>
          </div>

          {/* Right Arrow with large hit target */}
          <button
            type="button"
            aria-label="Next sale"
            onClick={handleNext}
            disabled={currentIndex >= activeSales.length - 1}
            className="w-11 h-11 shrink-0 rounded-full bg-[#F3F4F6] hover:bg-gray-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black transition-all"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Notice Message Banner */}
        {isConfirmed ? (
          <div className="flex items-center gap-2.5 p-3 rounded-[12px] bg-[#E9F6EC] border border-[#24C1664D] text-[#24C166] text-[13px] font-medium">
            <Check size={18} strokeWidth={2.5} className="shrink-0" />
            <span>Payment confirmed and added to sales.</span>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] text-[#4B5563] text-[13px] leading-relaxed">
            <Info size={18} className="shrink-0 text-[#6B7280] mt-0.5" />
            <span>Only confirm after you've verified that the payment was received.</span>
          </div>
        )}

        {/* Items Breakdown (if items exist) */}
        {currentSale.items && currentSale.items.length > 0 && (
          <div className="rounded-[14px] border border-[#F1F1F1] bg-white p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Items ({currentSale.items.length})
              </span>
              <span className="text-xs font-semibold text-black">
                Total: ₦ {formatCurrency(currentSale.amount || 0)}
              </span>
            </div>

            <div className="divide-y divide-[#F1F1F1]">
              {currentSale.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-[8px] bg-[#F3F4F6] flex items-center justify-center shrink-0 overflow-hidden text-gray-500">
                    {item.productImageUrl ? (
                      <Image
                        src={item.productImageUrl}
                        alt={item.productName || 'Product'}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag size={18} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-black truncate">
                      {item.quantity ? `${item.quantity}x ` : ''}
                      {item.productName || 'Custom item'}
                    </p>
                    {item.selectedVariant?.label && (
                      <p className="text-xs text-[#6B7280]">
                        {item.selectedVariant.label}
                      </p>
                    )}
                  </div>

                  <span className="text-sm font-bold text-black shrink-0">
                    ₦ {formatCurrency((item.price || 0) * (item.quantity || 1))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Information Card (Full Datapoint Breakdown) */}
        <div className="rounded-[14px] border border-[#F1F1F1] bg-white p-4 space-y-3.5 shadow-[0px_2px_6px_0px_#00000005]">
          <h3 className="font-bold text-[14px] text-black">
            Payment information
          </h3>

          <div className="space-y-3 text-[13px]">
            {/* Payment Method */}
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] font-normal">Payment method</span>
              <span className="font-semibold text-black text-right">
                {currentSale.paymentMethod || 'Bank transfer (Moniepoint)'}
              </span>
            </div>

            {/* Target Bank */}
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] font-normal">Target bank</span>
              <span className="font-semibold text-black text-right">
                {currentSale.targetBankName || 'Moniepoint MFB'}
              </span>
            </div>

            {/* Account Number */}
            {currentSale.targetAccountNumber && (
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] font-normal">Account number</span>
                <span className="font-semibold text-black text-right">
                  {currentSale.targetAccountNumber}
                </span>
              </div>
            )}

            {/* Date and Time */}
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] font-normal">Date and time</span>
              <span className="font-semibold text-black text-right">
                {formattedDate}
              </span>
            </div>

            {/* Sale ID / Reference with Copy */}
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] font-normal">Sale ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-black font-mono text-xs">
                  {currentSale.reference || currentSale._id.slice(-8).toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      currentSale.reference || currentSale._id,
                      'Sale ID',
                    )
                  }
                  className="p-1 text-gray-500 hover:text-black transition-colors"
                  aria-label="Copy sale ID"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] font-normal">Status</span>
              <span className="font-semibold text-right flex items-center gap-1.5">
                {isConfirmed ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#24C166]" />
                    <span className="text-[#24C166]">Paid</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#BB8123]" />
                    <span className="text-[#BB8123]">Unconfirmed</span>
                  </>
                )}
              </span>
            </div>

            {/* Via QR Kit */}
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] font-normal">Via</span>
              <span className="font-semibold text-black text-right">
                {currentSale.qrKitName ||
                  (currentSale.serialNumber
                    ? `QR Kit #${currentSale.serialNumber}`
                    : 'FSiD Scan')}
              </span>
            </div>

            {/* Rail */}
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] font-normal">Rail</span>
              <span className="font-semibold text-black text-right">
                {currentSale.paymentRail === 'paystack'
                  ? 'Paystack'
                  : currentSale.paymentRail === 'manual_transfer'
                    ? 'Manual Transfer'
                    : 'Direct Bank Transfer'}
              </span>
            </div>

            {/* Channel */}
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] font-normal">Channel</span>
              <span className="font-semibold text-black text-right">
                {currentSale.channel || 'Manual verification'}
              </span>
            </div>

            {/* Customer Note */}
            {currentSale.description && (
              <div className="flex items-start justify-between pt-1 border-t border-[#F1F1F1]">
                <span className="text-[#6B7280] font-normal">Note</span>
                <span className="font-medium text-black text-right max-w-[200px] text-xs">
                  {currentSale.description}
                </span>
              </div>
            )}

            {/* Customer Uploaded Receipt Preview */}
            {currentSale.receiptUrl && (
              <div className="pt-2 border-t border-[#F1F1F1]">
                <span className="text-[#6B7280] font-normal block mb-1.5">
                  Uploaded Receipt
                </span>
                <a
                  href={currentSale.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-semibold text-blue-600 hover:underline"
                >
                  <ExternalLink size={14} />
                  <span>View payment receipt</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Customer Card */}
        <div className="rounded-[14px] border border-[#F1F1F1] bg-white p-3.5 flex items-center justify-between gap-3 shadow-[0px_2px_6px_0px_#00000005]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#E5E7EB] flex items-center justify-center shrink-0 text-gray-700 font-bold">
              <User size={18} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[14px] text-black truncate">
                  {customerName}
                </p>
                {isRepeatCustomer && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#4B5563] shrink-0">
                    Repeat ({customerVisits} visits)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#757575] mt-0.5 truncate">
                {customerPhone || 'No phone number attached'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              showNotificationToast({
                message: 'Customer editing available in customer directory',
              })
            }
            className="px-3 py-1.5 rounded-full bg-[#F3F4F6] hover:bg-gray-200 text-xs font-bold text-black shrink-0 transition-colors"
          >
            UPDATE
          </button>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[#F1F1F1] shrink-0">
        {isConfirmed ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleUndo}
              className="flex-1 h-12 rounded-full bg-[#F3F4F6] hover:bg-gray-200 text-black font-bold text-[14px] flex items-center justify-center transition-colors"
            >
              Undo
            </button>
            <div className="flex-1 h-12 rounded-full bg-[#24C166] text-white font-bold text-[14px] flex items-center justify-center gap-2 opacity-95 cursor-default">
              <Check size={18} strokeWidth={3} />
              <span>Confirmed</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancelSale}
              disabled={archiveSaleMutation.isPending || confirmSaleMutation.isPending}
              className="flex-1 h-12 rounded-full bg-[#F3F4F6] hover:bg-gray-200 active:scale-[0.98] disabled:opacity-50 text-black font-bold text-[14px] flex items-center justify-center transition-all"
            >
              {archiveSaleMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Cancel sale'
              )}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={archiveSaleMutation.isPending || confirmSaleMutation.isPending}
              className="flex-1 h-12 rounded-full bg-[#24C166] hover:bg-[#20af5c] active:scale-[0.98] disabled:opacity-50 text-white font-bold text-[14px] flex items-center justify-center shadow-[0px_2px_4px_0px_#1433204D] transition-all"
            >
              {confirmSaleMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Confirm payment'
              )}
            </button>
          </div>
        )}

        <div className="mt-3">
          <TagFooter />
        </div>
      </div>
    </div>
  )
}
