'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Info,
  Check,
  ShoppingBag,
  Loader2,
  PenLine,
  Plus,
} from 'lucide-react'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils/date-time'
import { showNotificationToast } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import {
  useConfirmSale,
  useArchiveSale,
  useInfiniteSales,
  useUpdateSaleCustomer,
} from '@/services/sales/hooks'
import type { Sale } from '@/services/sales/interface'
import type { Customer } from '@/services/customers/customersApi'
import { MerchantAvatar } from '../layout'
import {
  getSaleCustomerPhotoUrl,
  getSaleCustomerName,
  getSaleCustomerPhone,
  isRegisteredCustomer,
  getSaleCustomerTitle,
} from '@/lib/utils/sales'
import { ClockIcon } from '@phosphor-icons/react'
import { Clock } from 'iconsax-reactjs'

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
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
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

  const confirmSaleMutation = useConfirmSale()
  const archiveSaleMutation = useArchiveSale()
  const updateSaleCustomerMutation = useUpdateSaleCustomer()

  // Current active sale
  const currentSale = activeSales[currentIndex]

  // If no sales left
  if (!currentSale || activeSales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-t-3xl min-h-[320px] text-center font-satoshi">
        <div className="w-12 h-12 rounded-full bg-[#E9F6EC] flex items-center justify-center text-[#24C166] mb-3">
          <Check size={28} strokeWidth={3} />
        </div>
        <h3 className="font-bold text-lg text-black">
          You&apos;re all caught up!
        </h3>
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

  const isArchived =
    currentSale.isArchived ||
    currentSale.status === 'ARCHIVED' ||
    currentSale.status === 'CANCELLED'
  const isConfirmed = !isArchived && currentSale.status === 'CONFIRMED'

  const formattedDate = (() => {
    const raw = currentSale.recordedAt || currentSale.createdAt
    return formatDateTime(raw, { ordinalDay: true, fallback: 'N/A' })
  })()

  const customerName = getSaleCustomerName(currentSale)
  const customerPhone = getSaleCustomerPhone(currentSale)
  const isRegistered = isRegisteredCustomer(currentSale)
  const customerTitle = getSaleCustomerTitle(currentSale)

  const customerVisits = currentSale.customerPurchaseCount || 1
  const isRepeatCustomer =
    currentSale.customerType === 'Repeat' || customerVisits > 1

  const saleReference =
    (currentSale.reference && currentSale.reference !== currentSale.serialNumber
      ? currentSale.reference
      : currentSale._id?.slice(-8).toUpperCase()) || 'N/A'

  const itemsTotal = useMemo(() => {
    if (!currentSale?.items || currentSale.items.length === 0) {
      return currentSale?.amount || 0
    }
    const sum = currentSale.items.reduce(
      (acc, item) => acc + (item.price || 0) * (item.quantity || 1),
      0,
    )
    return sum || currentSale?.amount || 0
  }, [currentSale])

  const paymentMethodDisplay = (() => {
    const method =
      currentSale.paymentMethod ||
      (currentSale.paymentRail === 'paystack' ? 'Card' : 'Bank Transfer')
    if (
      currentSale.targetBankName &&
      !method.toLowerCase().includes(currentSale.targetBankName.toLowerCase())
    ) {
      return `${method} (${currentSale.targetBankName})`
    }
    return method
  })()

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
      onSuccess: (updatedSale) => {
        setActiveSales((previousSales) =>
          previousSales.map((sale) =>
            sale._id === saleId ? { ...sale, ...updatedSale } : sale,
          ),
        )
        onConfirmSuccess?.(saleId)
        showNotificationToast({
          message: 'Payment confirmed',
          mode: 'success',
        })
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
      onSuccess: (updatedSale) => {
        setActiveSales((previousSales) =>
          previousSales.map((sale) =>
            sale._id === saleId ? { ...sale, ...updatedSale } : sale,
          ),
        )
        onArchiveSuccess?.(saleId)
        showNotificationToast({
          message: 'Sale cancelled and archived',
          mode: 'success',
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

  const handleSelectCustomer = (customer: Customer) => {
    closeDrawer('customer-select')
    updateSaleCustomerMutation.mutate(
      { saleId: currentSale._id, customerId: customer._id },
      {
        onSuccess: (updatedSale) => {
          setActiveSales((previousSales) =>
            previousSales.map((sale) =>
              sale._id === currentSale._id ? { ...sale, ...updatedSale } : sale,
            ),
          )
          showNotificationToast({
            message: 'Customer updated',
            mode: 'success',
          })
        },
        onError: () => {
          showNotificationToast({
            message: 'Failed to update customer',
            mode: 'error',
          })
        },
      },
    )
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-linear-to-br from-[#ffffff] to-[#f2f4f6] rounded-t-[12px] text-black">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-[#F1F1F1] shrink-0">
        <div className="flex items-center gap-2">
          <MerchantAvatar
            bankName={currentSale.targetBankName}
            profilePhotoUrl={getSaleCustomerPhotoUrl(currentSale)}
            alt={customerName}
            size={36}
          />

          <div className="flex flex-col">
            <h2 className="text-[13px] font-bold text-black leading-tight">
              {currentSale.source === 'QR scan'
                ? 'From QR kit scan'
                : customerName}
            </h2>
            <p className="text-[12px] text-[#6B7280] font-medium leading-none mt-0.5">
              {currentIndex + 1} of {activeSales.length}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => closeDrawer()}
          aria-label="Close"
          className="w-9 h-9 flex items-center justify-center text-black"
        >
          <X size={24} />
        </button>
      </header>

      {/* Scrollable Body */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 space-y-3">
        {/* Amount & Navigation Bar */}
        <div className="flex items-center justify-between gap-2 py-2">
          {/* Left Arrow with large hit target */}
          <button
            type="button"
            aria-label="Previous sale"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="w-9 h-9 shrink-0 flex items-center justify-center text-black transition-all"
          >
            <ChevronLeft size={28} strokeWidth={3} color="#D1D5DB" />
          </button>

          {/* Amount & Status Center */}
          <div className="flex flex-col items-center justify-center text-center flex-1 min-w-0">
            {isArchived ? (
              <span className="inline-flex items-center px-1.5 h-5 rounded-[6px] text-[11px] font-bold bg-[#E5E7EB] text-[#6B7280]">
                Archived
              </span>
            ) : isConfirmed ? (
              <span className="inline-flex items-center px-1.5 h-5 rounded-[6px] text-[11px] font-bold bg-[#24C1661A] text-[#24C166]">
                Confirmed
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 h-5 rounded-[6px] text-[11px] font-bold bg-[#BB81231A] text-[#BB8123]">
                Unconfirmed
              </span>
            )}

            <h1 className="text-[20px] font-bold text-black mt-2">
              ₦ {formatCurrency(currentSale.amount || 0)}
            </h1>
          </div>

          {/* Right Arrow with large hit target */}
          <button
            type="button"
            aria-label="Next sale"
            onClick={handleNext}
            disabled={currentIndex >= activeSales.length - 1}
            className="w-9 h-9 shrink-0 flex items-center justify-center text-black transition-all"
          >
            <ChevronRight size={28} strokeWidth={3} color="#D1D5DB" />
          </button>
        </div>

        {/* Notice Message Banner */}
        {isArchived ? (
          <div className="flex items-center gap-2.5 p-3 rounded-[12px] bg-[#F3F4F6] text-[#6B7280] text-[13px] font-medium">
            <X size={18} strokeWidth={2.5} className="shrink-0" />
            <span>Sale cancelled and archived.</span>
          </div>
        ) : isConfirmed ? (
          <div className="flex items-center justify-center -mt-3">
            <p className="text-[#00000080] text-[14px] font-medium">
              Payment confirmed and added to sales.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-start gap-2 p-3 rounded-[12px] bg-[#F8F8F8] text-[#00000066] text-[12px]">
            <Info size={16} className="shrink-0 text-[#6B7280]" />
            <span>
              Only confirm after you&apos;ve verified that the payment was
              received.
            </span>
          </div>
        )}

        <div className="border-t border-[#f1f1f1] -mx-3 px-3 pt-3">
          {/* Items Breakdown (if items exist) */}
          {currentSale.items && currentSale.items.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-[15px] text-black mb-2.5 ml-0.5">
                Items ({currentSale.items.length})
              </h3>
              <div className="rounded-[16px] border border-[#F1F1F1] bg-white p-4 shadow-[0px_2px_6px_0px_#00000005]">
                <div className="divide-y divide-[#F1F1F1]">
                  {currentSale.items.map((item, idx) => {
                    const itemSubtitle =
                      item.selectedVariant?.label ||
                      item.productDescription ||
                      item.selectedVariant?.values
                        ?.map((v) => v.value)
                        .join(' / ')
                    const qty = item.quantity || 1
                    const unitPrice = item.price || 0
                    const itemTotal = unitPrice * qty

                    return (
                      <div key={idx} className={idx === 0 ? 'pb-4' : 'py-4'}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[14px] text-[#111827] truncate leading-snug">
                              {item.productName || 'Custom item'}
                            </h4>
                            {itemSubtitle && (
                              <p className="text-[14px] text-[#6B7280] font-medium truncate mt-0.5 leading-normal">
                                {itemSubtitle}
                              </p>
                            )}
                          </div>
                          <div className="w-[48px] h-[48px] rounded-[8px] bg-[#F3F4F6] shrink-0 overflow-hidden ml-2">
                            {item.productImageUrl ? (
                              <Image
                                src={item.productImageUrl}
                                alt={item.productName || 'Product'}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ShoppingBag size={20} />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3.5">
                          <span className="text-[14px] text-[#6B7280] font-medium">
                            {qty} x ₦{formatCurrency(unitPrice)}
                          </span>
                          <span className="font-bold text-[14px] text-[#111827]">
                            ₦{formatCurrency(itemTotal)}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  <div className="flex items-center justify-between pt-4">
                    <span className="font-bold text-[15px] text-black">
                      Total
                    </span>
                    <span className="font-bold text-[15px] text-black">
                      ₦{formatCurrency(itemsTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <h3 className="font-bold text-[14px] text-black mb-3 ml-0.5">
            Payment information
          </h3>
          {/* Payment Information Card (Full Datapoint Breakdown) */}
          <div className="rounded-[14px] border border-[#F1F1F1] bg-white p-4 space-y-3.5 shadow-[0px_2px_6px_0px_#00000005]">
            <div className="space-y-4 text-[13px]">
              {/* Payment Method */}
              <div className="flex items-center justify-between">
                <span className="text-[#00000080] font-medium text-[14px]">
                  Payment method
                </span>
                <span className="font-medium text-[14px] text-black text-right">
                  {paymentMethodDisplay}
                </span>
              </div>

              {/* Date and Time */}
              <div className="flex items-center justify-between">
                <span className="text-[#00000080] font-medium text-[14px]">
                  Date and time
                </span>
                <span className="font-medium text-[14px] text-black text-right">
                  {formattedDate}
                </span>
              </div>

              {/* Sale ID / Reference with Copy */}
              <div className="flex items-center justify-between">
                <span className="text-[#00000080] font-medium text-[14px]">
                  Sale ID
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-[14px] text-black">
                    {saleReference}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(saleReference, 'Sale ID')}
                    className="p-1 text-gray-500 hover:text-black transition-colors"
                    aria-label="Copy sale ID"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-[#00000080] font-medium text-[14px]">
                  Status
                </span>
                <span className="font-medium text-[14px] text-black text-right flex items-center gap-1.5">
                  {isArchived ? (
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#6B7280]" />
                      <span className="text-[#6B7280]">Archived</span>
                    </div>
                  ) : isConfirmed ? (
                    <div className="flex items-center gap-1">
                      <div className="w-4.5 h-4.5 rounded-full bg-[#24C166] flex justify-center items-center">
                        <Check size={12} color="white" strokeWidth={3} />
                      </div>
                      <span className="text-[#24C166]">Paid</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Clock
                        size="20"
                        color="#BB8123"
                        variant="Bold"
                        strokeWidth={3}
                      />
                      <span className="text-[#BB8123]">Unconfirmed</span>
                    </div>
                  )}
                </span>
              </div>

              {/* Via QR Kit */}
              <div className="flex items-center justify-between">
                <span className="text-[#00000080] font-medium text-[14px]">
                  Via
                </span>
                <span className="font-medium text-[14px] text-black text-right">
                  {currentSale.qrKitName ||
                    (currentSale.serialNumber
                      ? `QR Kit #${currentSale.serialNumber}`
                      : 'FSiD Scan')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Card */}
        <h3 className="font-bold text-[14px] text-black pt-1 mb-3 ml-0.5">
          Customer
        </h3>

        <div className="rounded-[12px] border border-[#F1F1F1] bg-white p-3 flex items-center justify-between gap-3 shadow-[0px_4px_8px_0px_#0000000A]">
          <div className="flex items-center gap-3 min-w-0">
            <MerchantAvatar
              bankName={currentSale.targetBankName}
              profilePhotoUrl={getSaleCustomerPhotoUrl(currentSale)}
              alt={customerTitle}
              size={36}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[14px] text-black truncate">
                  {customerTitle}
                </p>
                {isRegistered && isRepeatCustomer && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#4B5563] shrink-0">
                    Repeat ({customerVisits} visits)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#757575] mt-0.5 truncate">
                {isRegistered
                  ? customerPhone || 'No phone number attached'
                  : 'Add details'}
              </p>
            </div>
          </div>

          {!isRegistered ? (
            <button
              type="button"
              onClick={() =>
                openDrawer({
                  type: 'add-customer',
                  props: {
                    onSelect: (customer: Customer) => {
                      closeDrawer('add-customer')
                      handleSelectCustomer(customer)
                    },
                  },
                })
              }
              disabled={
                isConfirmed ||
                isArchived ||
                updateSaleCustomerMutation.isPending
              }
              className="px-3 h-9 w-fit rounded-full bg-[#F1F1F1] text-[10px] font-bold text-black tracking-[1px] flex justify-center items-center gap-1.5 disabled:opacity-50"
            >
              <Plus size={14} /> ADD
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                openDrawer({
                  type: 'customer-select',
                  props: {
                    title: 'Who paid you?',
                    onSelect: handleSelectCustomer,
                    onBack: () => closeDrawer('customer-select'),
                  },
                })
              }
              disabled={
                isConfirmed ||
                isArchived ||
                updateSaleCustomerMutation.isPending
              }
              className="px-3 h-9 w-fit rounded-full bg-[#F1F1F1] text-[10px] font-bold text-black tracking-[1px] flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <PenLine size={14} /> UPDATE
            </button>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-[#F1F1F1] shrink-0 bg-white">
        {isArchived ? (
          <div className="h-11 rounded-full bg-[#E5E7EB] text-[#6B7280] font-bold text-[14px] flex items-center justify-center gap-2">
            <X size={18} strokeWidth={3} />
            <span>Archived</span>
          </div>
        ) : isConfirmed ? (
          <div className="h-11 opacity-70 rounded-full bg-[#24C166] text-white font-bold text-[14px] flex items-center justify-center gap-2 cursor-default">
            <Check size={18} strokeWidth={3} />
            <span>Confirmed</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancelSale}
              disabled={
                archiveSaleMutation.isPending || confirmSaleMutation.isPending
              }
              className="flex-1 h-11 rounded-full bg-[#E5E7EB] disabled:opacity-50 text-black font-bold text-[14px] flex items-center justify-center transition-all"
            >
              {archiveSaleMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Cancel sale'
              )}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={
                archiveSaleMutation.isPending || confirmSaleMutation.isPending
              }
              className="flex-1 h-11 rounded-full bg-[#24C166] disabled:opacity-50 text-white font-bold text-[14px] flex items-center justify-center transition-all"
            >
              {confirmSaleMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Confirm payment'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
