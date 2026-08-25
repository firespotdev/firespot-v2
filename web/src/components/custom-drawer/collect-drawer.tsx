'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  X,
  ChevronRight,
  FileText,
  Check,
  Link2,
  PenLine,
  Share,
} from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import {
  showNotificationToast,
  GradientQRCode,
  TagFooter,
  GreenSpinner,
} from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { useSocket } from '@/hooks/useSocket'
import { useRecordSale, useCancelSale, useSale } from '@/services/sales/hooks'
import { MerchantAvatar } from '../layout/MerchantAvatar'
import { useUserProfile } from '@/services/users'
import { useQueryClient } from '@tanstack/react-query'
import type { Sale } from '@/services/sales/interface'
import { getSaleCustomerPhotoUrl } from '@/lib/utils/sales'

interface Props {
  sale: Sale
  onRecordConfirm: (recordedSale: Sale | null) => void
}

export function CollectPaymentDrawer({
  sale: initialSale,
  onRecordConfirm,
}: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const closeAllDrawers = useDrawerStore((state) => state.closeAllDrawers)
  const recordSaleMutation = useRecordSale()
  const cancelSaleMutation = useCancelSale()
  const { socket, isConnected } = useSocket()
  const queryClient = useQueryClient()
  const { data: profile } = useUserProfile()
  const lastPaymentDeclaredAt = useRef<string | null>(
    initialSale.customerMarkedPaidAt
      ? String(initialSale.customerMarkedPaidAt)
      : null,
  )
  const hasCompletedConfirmation = useRef(false)

  const saleId = String(initialSale._id)
  const { data: fetchedSale, refetch: refetchSale } = useSale(saleId, {
    initialData: initialSale,
    recoveryIntervalMs: isConnected ? 15_000 : 5_000,
  })
  const sale = fetchedSale || initialSale
  const [countdown, setCountdown] = useState(59)
  const [step, setStep] = useState<'qr' | 'uploaded' | 'loading'>('qr')
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false)
  const [overrideView, setOverrideView] = useState<
    'qr' | 'waiting' | 'confirm' | 'paystack' | null
  >(null)

  const activeView = useMemo(() => {
    if (sale.paymentRail === 'paystack' && sale.status === 'PENDING') {
      return 'paystack'
    }
    return (
      overrideView ||
      // A receipt or an explicit "I have paid" declaration advances the
      // merchant to confirmation. Scanning/copying alone remains "waiting".
      (sale.receiptUrl || sale.customerMarkedPaidAt
        ? 'confirm'
        : sale.isScanned || sale.isCopied
          ? 'waiting'
          : 'qr')
    )
  }, [overrideView, sale])

  const finishConfirmation = useCallback(
    (recordedSale: Sale | null) => {
      if (hasCompletedConfirmation.current) return
      hasCompletedConfirmation.current = true
      onRecordConfirm(recordedSale)
    },
    [onRecordConfirm],
  )

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (activeView === 'qr') {
      timer = setTimeout(
        () => setCountdown((current) => (current > 0 ? current - 1 : 59)),
        1000,
      )
    }
    return () => clearTimeout(timer)
  }, [countdown, activeView])

  useEffect(() => {
    if (!socket || !saleId) return

    const syncSale = (data: Sale) => {
      if (String(data?._id) !== saleId) return false
      queryClient.setQueryData(['sale', saleId], data)
      setOverrideView(null)
      return true
    }

    const joinSaleRoom = () => {
      socket.emit('join-sale-room', saleId)
      void refetchSale()
    }

    if (socket.connected) joinSaleRoom()
    socket.on('connect', joinSaleRoom)

    const handleReceiptUploaded = (data: Sale) => {
      syncSale(data)
    }

    const handleReceiptDeleted = (data: Sale) => {
      if (syncSale(data)) {
        setIsReceiptPreviewOpen(false)
      }
    }

    const handlePaymentDeclared = (data: Sale) => {
      if (String(data?._id) === saleId) {
        const declaredAt = data.customerMarkedPaidAt
          ? String(data.customerMarkedPaidAt)
          : null
        if (declaredAt && lastPaymentDeclaredAt.current === declaredAt) return
        lastPaymentDeclaredAt.current = declaredAt
        syncSale(data)
        showNotificationToast({ message: 'Customer says they have paid' })
      }
    }

    const handleSaleConfirmed = (data: Sale) => {
      syncSale(data)
    }

    const handlePaymentProcessing = (data: Sale) => {
      syncSale(data)
    }

    const handleSaleScanned = (data: Sale) => {
      syncSale(data)
    }

    const handleSaleCopied = (data: Sale) => {
      syncSale(data)
    }

    const handleSaleCancelled = (data: Sale) => {
      syncSale(data)
    }

    socket.on('receipt.uploaded', handleReceiptUploaded)
    socket.on('receipt.deleted', handleReceiptDeleted)
    socket.on('payment.declared', handlePaymentDeclared)
    socket.on('sale.confirmed', handleSaleConfirmed)
    socket.on('payment.processing', handlePaymentProcessing)
    socket.on('sale.scanned', handleSaleScanned)
    socket.on('sale.copied', handleSaleCopied)
    socket.on('sale.cancelled', handleSaleCancelled)

    return () => {
      socket.off('connect', joinSaleRoom)
      socket.off('receipt.uploaded', handleReceiptUploaded)
      socket.off('receipt.deleted', handleReceiptDeleted)
      socket.off('payment.declared', handlePaymentDeclared)
      socket.off('sale.confirmed', handleSaleConfirmed)
      socket.off('payment.processing', handlePaymentProcessing)
      socket.off('sale.scanned', handleSaleScanned)
      socket.off('sale.copied', handleSaleCopied)
      socket.off('sale.cancelled', handleSaleCancelled)
    }
  }, [socket, saleId, queryClient, refetchSale])

  useEffect(() => {
    if (sale.status === 'CONFIRMED') {
      finishConfirmation(sale)
      return
    }
    if (sale.status === 'CANCELLED') {
      closeDrawer()
      if (sale.cancelledBy === 'customer') {
        showNotificationToast({ message: 'Customer cancelled this payment' })
      }
    }
  }, [sale, finishConfirmation, closeDrawer])

  const handleConfirmReceipt = () => {
    setStep('loading')
    recordSaleMutation.mutate(
      {
        saleId: sale._id,
        payload: {
          amount: sale.amount || 0,
          description: sale.description,
          paymentMethod: 'Bank Transfer',
          isPaidInFull: true,
          amountPaid: sale.amount || 0,
          totalDue: sale.amount || 0,
          balanceOwed: 0,
        },
      },
      {
        onSuccess: (data) => {
          finishConfirmation(data)
        },
        onError: (error: unknown) => {
          showNotificationToast({
            message:
              (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message || 'Failed to confirm receipt.',
            mode: 'error',
          })
          setStep('qr')
        },
      },
    )
  }

  const handleCancelCollect = () => {
    setStep('loading')
    cancelSaleMutation.mutate(sale._id, {
      onSuccess: () => {
        closeDrawer()
      },
      onError: (error: unknown) => {
        showNotificationToast({
          message:
            (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || 'Failed to cancel collect payment.',
          mode: 'error',
        })
        setStep('qr')
      },
    })
  }

  const handleNewSale = () => {
    onRecordConfirm(null)
    closeDrawer()
  }

  const handleRecordSale = () => {
    if (!sale?._id) return

    closeAllDrawers()
    useDrawerStore.getState().openDrawer({
      type: 'record-sale',
      props: { confirmId: sale._id },
    })
  }

  const handleBackStep = () => {
    if (activeView === 'confirm') {
      if (sale.isScanned) {
        setOverrideView('waiting')
      } else {
        setOverrideView('qr')
      }
    } else if (activeView === 'waiting') {
      setOverrideView('qr')
    }
  }

  const checkoutUrl = `${window.location.origin}/pay/${sale.serialNumber || 'default'}?saleId=${sale._id}`

  if (step === 'loading') {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12 bg-white font-satoshi h-full">
        <GreenSpinner size={6} />
      </div>
    )
  }

  const itemCount = sale.items?.length || 0
  const customerPhotoUrl = getSaleCustomerPhotoUrl(sale)

  const saleTimestamp = sale.updatedAt || sale.createdAt
  const formattedPillDate =
    new Date(saleTimestamp).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      },
    ) +
    ' . ' +
    new Date(saleTimestamp).toLocaleTimeString(
      'en-US',
      {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      },
    )

  return (
    <div className="w-full h-full flex flex-col justify-between relative">
      {/* 1. Customer receipt overlay modal (Screenshot 1) */}
      {isReceiptPreviewOpen && (
        <div className="absolute inset-0 bg-[#F4F6F8] z-50 flex flex-col justify-between">
          {/* Overlay Header */}
          <header className="p-4 flex justify-between bg-white items-center shrink-0 relative">
            <div className="flex items-center gap-1.5">
              <FileText size={20} color="#24C166" />
              <span className="text-sm font-medium text-black">
                Customer uploaded receipt
              </span>
            </div>
            <button onClick={() => setIsReceiptPreviewOpen(false)}>
              <X size={20} color="black" />
            </button>
          </header>

          {/* Receipt image wrapper */}
          <div className="flex-1 w-full bg-[#F4F6F8] flex flex-col items-center justify-center overflow-hidden">
            <div className="flex justify-center items-center bg-[#EBEDEF] border border-[#DFDFDF] max-w-70 w-full max-h-100 h-full rounded-[12px]">
              {sale.receiptUrl ? (
                <img
                  src={sale.receiptUrl}
                  alt="Receipt proof"
                  className="w-full h-full object-contain rounded-[12px]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#9CA3AF]">
                  <FileText size={20} />
                  <span className="text-[13px] font-medium mt-2">
                    Uploaded receipt loading...
                  </span>
                </div>
              )}
            </div>

            <p className="text-[13px] text-[#00000080] font-medium text-center mt-4">
              Confirm if the money came in, cancel if it didn&apos;t.
            </p>
          </div>

          {/* Bottom Confirmation Pill */}
          <div className="bg-white shadow-[0px_4px_16px_rgba(0,0,0,0.06)] border border-[#F1F1F1] rounded-t-2xl p-4 flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <MerchantAvatar size={36} profilePhotoUrl={customerPhotoUrl} />
              <div className="text-left">
                <h4 className="text-[13px] font-bold text-black">
                  New payment from customer
                </h4>
                <p className="text-[13px] text-[#00000060] font-medium mt-0.5">
                  {formattedPillDate}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelCollect}
                className="w-10 h-10 rounded-full bg-[#0000000A] hover:bg-[#0000000A]/90 border border-[#0000000A] text-black flex items-center justify-center transition-colors"
              >
                <X size={16} color="black" />
              </button>
              <button
                onClick={handleConfirmReceipt}
                className="w-10 h-10 rounded-full bg-[#24C166] hover:bg-[#24C166]/90 border border-[#0000000A] text-white flex items-center justify-center transition-colors"
              >
                <Check size={16} color="white" strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Drawer Flow Header */}
      <div
        className={
          activeView === 'qr'
            ? 'flex justify-between items-center shrink-0 relative py-4 border-b border-[#F1F1F1] px-4'
            : `flex justify-between items-center shrink-0 relative py-4 px-4`
        }
      >
        {activeView === 'waiting' || activeView === 'confirm' ? (
          <BackButton
            onClick={handleBackStep}
            iconSize={20}
            className="-m-3"
          />
        ) : (
          <div className="w-5 h-5"></div>
        )}
        <div className="flex-1 flex justify-center">
          <h2 className="text-base font-bold text-black">
            {activeView === 'qr' ? 'Collect' : ''}
          </h2>
        </div>
        <button
          type="button"
          onClick={handleNewSale}
          aria-label="Close collection flow"
          className="-m-3 inline-flex min-h-11 min-w-11 items-center justify-center"
        >
          <X size={20} color="#000000" />
        </button>
      </div>

      {/* Main Drawer Content */}
      <div className="flex-1 flex flex-col items-center text-center justify-center my-auto px-4">
        {/* State 1: QR Code View */}
        {activeView === 'qr' && (
          <div className="w-full flex flex-col items-center gap-2">
            <span className="text-[#00000080] text-[15px] font-medium leading-[140%] inline-block mb-5">
              Ask customer to scan <br /> the QR code below to pay
            </span>
            <p className="text-[48px] font-family-sofia-pro font-medium text-black">
              ₦
              {sale.amount?.toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </p>

            <button
              type="button"
              onClick={() =>
                useDrawerStore.getState().openDrawer({
                  type: 'sale-items',
                  props: { items: sale.items || [] },
                })
              }
              className="flex items-center gap-px text-sm text-[#00000080] mb-2 mt-2 font-medium hover:opacity-85"
            >
              <span className="mr-1">For</span>
              <span className="underline underline-offset-3 text-black">
                {itemCount} item{itemCount !== 1 ? 's' : ''}
              </span>
              <ChevronRight
                strokeWidth={2}
                size={14}
                color="black"
                className="mt-[1.5%]"
              />
            </button>

            {/* Gradient Border QR Wrapper */}
            <div className="p-0.75 rounded-[20px] bg-linear-to-tr from-[#D72483] to-[#FB5012]">
              <div className="p-3.5 rounded-[18px] bg-white flex items-center justify-center">
                <GradientQRCode
                  value={checkoutUrl}
                  size={210}
                  centerImageUrl={
                    profile?.businessImageUrl || profile?.profilePhotoUrl
                  }
                  centerImageAlt={profile?.businessName || 'Merchant'}
                  centerImageSize={74}
                />
              </div>
            </div>

            <p className="text-[13px] text-[#00000066] font-medium mt-2">
              Refreshes in:{' '}
              <span className="text-[#000000B2]">
                00:
                {countdown.toString().padStart(2, '0')}
              </span>
            </p>
          </div>
        )}

        {/* State 2: Waiting for customer to pay */}
        {activeView === 'waiting' && (
          <div className="w-full flex flex-col items-center py-4">
            <div className={`relative w-16 h-16 animate-spin`}>
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg at 50% 50%, rgba(103, 206, 103, 0.1) 0%, #67ce67 300deg, rgba(103, 206, 103, 0) 270deg)',
                }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] h-[75%] rounded-full"
                style={{ background: 'white' }}
              />
            </div>
            <h3 className="text-xl font-bold text-black leading-tight mt-4">
              Waiting for customer to pay
            </h3>
            <p className="text-sm text-[#00000080] font-medium mt-1.5 max-w-70">
              You would receive a notification immediately the customer
              initiates payment.
            </p>

            {sale.isCopied && (
              <div className="mt-6 w-full bg-white shadow-[0px_4px_8px_0px_#0000000A] border border-[#EBEBEB] rounded-[12px] px-4 py-3 flex justify-between items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <MerchantAvatar
                    size={36}
                    profilePhotoUrl={customerPhotoUrl}
                  />
                  <div className="min-w-0 text-left">
                    <h4 className="truncate text-[13px] font-bold text-black">
                      From payment link
                    </h4>
                    <p className="mt-0.5 text-[12px] font-medium text-[#6B7280]">
                      {formattedPillDate}
                    </p>
                  </div>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label="Cancel sale"
                    onClick={handleCancelCollect}
                    className="w-10 h-10 rounded-full bg-[#0000000A] hover:bg-[#0000000A]/90 border-[#0000000A] border shadow-[0px_2.2px_4.4px_0px_#0000000A] text-black flex items-center justify-center transition-colors"
                  >
                    <X size={16} color="black" />
                  </button>
                  <button
                    type="button"
                    aria-label="Confirm payment"
                    onClick={handleConfirmReceipt}
                    className="w-10 h-10 rounded-full bg-[#24C166] hover:bg-[#24C166]/90 border-[#0000000A] border shadow-[0px_2.2px_4.4px_0px_#0000000A] text-white flex items-center justify-center transition-colors"
                  >
                    <Check size={16} color="white" strokeWidth={3} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'paystack' && (
          <div className="flex w-full flex-col items-center py-8 text-center">
            <GreenSpinner innerBg="white" size={16} />
            <h3 className="mt-6 text-xl font-bold leading-tight text-black">
              Paystack is confirming payment
            </h3>
            <p className="mt-2 max-w-72 text-sm font-medium text-[#00000080]">
              This sale will be recorded automatically once Paystack confirms
              receipt. No manual approval is needed.
            </p>
          </div>
        )}

        {/* State 3: Confirm payment receipt */}
        {activeView === 'confirm' && (
          <div className="w-full flex flex-col items-center py-4 gap-6">
            <div className="w-full flex flex-col items-center">
              <GreenSpinner innerBg="white" size={16} />
              <h3 className="text-xl font-bold text-black leading-none mt-6">
                Confirm payment receipt
              </h3>
              <p className="text-sm text-[#00000080] font-medium mt-2">
                Your account number has been copied. Confirm or cancel the sale
                as the case may be.
              </p>
            </div>

            {/* Stack list of notification pills */}
            <div className="w-full flex flex-col gap-3">
              {/* Pill 1: Link Copied Notification */}
              <div className="w-full bg-white shadow-[0px_4px_8px_0px_#0000000A] border border-[#EBEBEB] rounded-[12px] px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <MerchantAvatar
                    size={36}
                    profilePhotoUrl={customerPhotoUrl}
                  />
                  <div className="text-left">
                    <h4 className="text-[13px] font-bold text-black">
                      From payment link
                    </h4>
                    <p className="text-[12px] text-[#6B7280] font-medium mt-0.5">
                      {formattedPillDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelCollect}
                    className="w-10 h-10 rounded-full bg-[#0000000A] hover:bg-[#0000000A]/90 border-[#0000000A] border shadow-[0px_2.2px_4.4px_0px_#0000000A] text-black flex items-center justify-center transition-colors"
                  >
                    <X size={16} color="black" />
                  </button>
                  <button
                    onClick={handleConfirmReceipt}
                    className="w-10 h-10 rounded-full bg-[#24C166] hover:bg-[#24C166]/90 border-[#0000000A] border shadow-[0px_2.2px_4.4px_0px_#0000000A] text-white flex items-center justify-center transition-colors"
                  >
                    <Check size={16} color="white" />
                  </button>
                </div>
              </div>

              {/* Pill 2: Uploaded Receipt Card (if receiptUrl exists) */}
              {sale.receiptUrl && (
                <div className="w-full shadow-[0px_4px_8px_0px_#0000000A] border-[3px] border-[#24C1664D] rounded-[12px] p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <FileText size={20} color="#24C166" />
                    <div className="text-left">
                      <h4 className="text-[14px] font-medium text-[#000000]">
                        Customer uploaded receipt
                      </h4>
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsReceiptPreviewOpen(true)}
                    className="w-fit bg-[#0000000A] shadow-[0px_2px_4px_0px_#0000000A] border border-[#0000000A] rounded-4xl px-4 h-8.5 text-black text-[10px] tracking-[1px] font-bold"
                  >
                    VIEW
                  </Button>
                </div>
              )}
              {!sale.receiptUrl && sale.customerMarkedPaidAt && (
                <div className="w-full rounded-[12px] border-[3px] border-[#24C1664D] p-3 text-left shadow-[0px_4px_8px_0px_#0000000A]">
                  <h4 className="text-sm font-bold text-black">
                    Customer marked this payment as paid
                  </h4>
                  <p className="mt-1 text-xs font-medium text-[#00000080]">
                    Check your bank account before confirming.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Bottom Actions */}
      <div className="w-full shrink-0 flex flex-col items-center mt-auto">
        {/* QR Actions */}
        {activeView === 'qr' && (
          <div className="w-full flex gap-3 border-t border-[#F4F6F8] py-4 px-4">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(checkoutUrl)
                showNotificationToast({
                  message: 'Checkout link copied',
                  mode: 'success',
                })
              }}
              className="flex-1 flex flex-col items-center justify-center h-19 bg-[#F4F6F8] hover:bg-[#F4F6F8]/80 text-black font-medium rounded-[12px] gap-2 py-2"
            >
              <Link2 size={24} color="black" />
              <span className="text-[14px] font-medium text-[#000000]">
                Copy link
              </span>
            </Button>

            <Button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'Firespot Pay', url: checkoutUrl })
                }
              }}
              className="flex-1 flex flex-col items-center justify-center h-19 bg-[#F4F6F8] hover:bg-[#F4F6F8]/80 text-black font-medium rounded-[12px] gap-2 py-2"
            >
              <Share size={16} color="black" />
              <span className="text-[14px] font-medium text-[#000000]">
                Share link
              </span>
            </Button>

            <Button
              onClick={handleRecordSale}
              className="flex-1 flex flex-col items-center justify-center h-19 bg-[#F4F6F8] hover:bg-[#F4F6F8]/80 text-black font-medium rounded-[12px] gap-2 py-2"
            >
              <PenLine size={16} color="black" />
              <span className="text-[14px] font-medium text-[#000000]">
                Record sale
              </span>
            </Button>
          </div>
        )}

        {/* Waiting / Confirm Bottom "New sale" Action Button */}
        {activeView !== 'qr' && (
          <div className="px-4 w-full pb-2">
            <Button
              onClick={handleNewSale}
              className="w-full bg-[#F1F1F1] text-black hover:bg-[#F1F1F1]/80 rounded-[48px] h-12 font-bold border-none mb-2"
            >
              New sale
            </Button>

            <TagFooter />
          </div>
        )}
      </div>
    </div>
  )
}
