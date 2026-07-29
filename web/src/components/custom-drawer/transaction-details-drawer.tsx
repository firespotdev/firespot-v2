'use client'

import { useMemo } from 'react'
import {
  Share,
  Download,
  Copy,
  PencilLine,
  MoreVertical,
  Archive,
  Check,
  PlusCircle,
  Bell,
  ChevronRight,
  Loader2,
  MoreHorizontal,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Button,
  TagFooter,
  StatusBadge,
  CircularIconButton,
  ClockGradientIcon,
  ClockFillIcon,
} from '../ui'
import { format } from 'date-fns'
import { useDrawerStore } from '@/services/drawer'
import { Sale } from '@/services/sales/interface'
import { getMerchantStatus, getSaleDescription } from '@/lib/utils/sales'

import { cn, formatCurrency } from '@/lib/utils'

interface TransactionDetailsDrawerProps {
  sale: Sale
  onClose: () => void
  justRecorded?: boolean
}

const TransactionDetailsDrawer = ({
  sale,
  justRecorded = false,
}: TransactionDetailsDrawerProps) => {
  const router = useRouter()
  const { openDrawer, closeDrawer } = useDrawerStore()

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A'
    try {
      return format(new Date(date), 'MMMM do, yyyy . h:mm a')
    } catch {
      return String(date)
    }
  }

  const merchantStatus = getMerchantStatus(sale)
  const isOutstanding = merchantStatus === 'Owing'
  const isConfirmed = merchantStatus === 'Paid'
  const isArchived = merchantStatus === 'Archived'
  const isUnconfirmed = merchantStatus === 'Unconfirmed'

  const amountPaid = useMemo(() => {
    if (sale.amountPaid !== undefined && sale.amountPaid !== null) {
      return sale.amountPaid
    }
    return Math.max(0, (sale.amount || 0) - (sale.balanceOwed || 0))
  }, [sale])

  const customerName = useMemo(() => {
    if (typeof sale?.customerId === 'object' && sale?.customerId?.name) {
      return sale.customerId.name
    }
    if (
      typeof sale?.customerId === 'object' &&
      sale?.customerId?.businessName
    ) {
      return sale.customerId.businessName
    }
    if (sale?.customerName) {
      return sale.customerName
    }
    return sale?.customerType === 'Repeat'
      ? `Repeat (${sale.customerPurchaseCount || 1} purchases)`
      : 'New'
  }, [sale])

  const handleRecordRepayment = () => {
    try {
      const progressWindow = window as Window & {
        bprogress?: { start: () => void }
      }
      if (typeof window !== 'undefined' && progressWindow.bprogress) {
        progressWindow.bprogress.start()
      }
    } catch {}
    closeDrawer()
    router.push(`/record-repayment?id=${sale._id}`)
  }

  const handleShareReceipt = () => {
    if (!navigator.share) return
    void navigator
      .share({
        title: 'Firespot Receipt',
        text: `Receipt for payment of NGN ${formatCurrency(sale.amount || 0)} on ${formatDate(sale.createdAt)}`,
        url: window.location.href,
      })
      .catch(() => {})
  }

  const recordedAt = sale.recordedAt || sale.createdAt
  const recordedDate = recordedAt
    ? format(new Date(recordedAt), "EEEE do 'of' MMMM, yyyy 'at' h:mm a")
    : 'the recorded time'
  const recordedTitle = (sale as Sale & { isEdit?: boolean }).isEdit
    ? 'Sale updated successfully'
    : isOutstanding
      ? 'Partial payment recorded'
      : 'Full payment recorded'
  const recordedSummary = isOutstanding
    ? `${sale.paymentMethod || 'Payment'} payment of NGN ${formatCurrency(amountPaid)} on ${recordedDate}. NGN ${formatCurrency(sale.balanceOwed || 0)} outstanding${sale.dueDate ? ` balance due by ${format(new Date(sale.dueDate), 'do MMMM, yyyy')}` : ''}.`
    : `${sale.paymentMethod || 'Payment'} payment of NGN ${formatCurrency(sale.amount || 0)} on ${recordedDate}.`

  return (
    <div className="flex flex-col h-full font-satoshi bg-white">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 text-black w-full text-center flex justify-between items-center bg-white">
        {justRecorded ? (
          <>
            <CircularIconButton
              icon={<MoreHorizontal size={20} />}
              size="sm"
              onClick={() => {
                openDrawer({
                  type: 'transaction-options',
                  props: { sale },
                })
              }}
            />
            <span />
            <CircularIconButton icon="x" size="md" onClick={closeDrawer} />
          </>
        ) : (
          <>
            <CircularIconButton
              icon="arrow-left"
              size="md"
              onClick={closeDrawer}
            />
            <h2 className="text-base font-bold">Transaction details</h2>
            <CircularIconButton
              icon={<MoreVertical size={20} />}
              size="sm"
              onClick={() => {
                openDrawer({
                  type: 'transaction-options',
                  props: { sale },
                })
              }}
            />
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center pt-6 px-4">
          {/* Status Icon Ring */}
          {isOutstanding ? (
            <div className="mb-2 shrink-0 -mt-1">
              <ClockGradientIcon size={80} strokeWidth={1} />
            </div>
          ) : (
            <div
              className={cn(
                'w-16 h-16 rounded-full border-4 flex items-center justify-center mb-4 bg-white shrink-0',
                isArchived
                  ? 'border-[#D1D5DB]'
                  : merchantStatus === 'Unconfirmed'
                    ? 'border-[#BB8123]'
                    : 'border-[#24C166]',
              )}
            >
              <Check
                className={
                  isArchived
                    ? 'text-[#D1D5DB]'
                    : merchantStatus === 'Unconfirmed'
                      ? 'text-[#BB8123]'
                      : 'text-[#24C166]'
                }
                size={32}
                strokeWidth={3}
              />
            </div>
          )}

          {/* Amount and Status Message */}
          <div className="mb-6 text-center">
            {justRecorded ? (
              <>
                <h3 className="text-[20px] font-bold text-black -tracking-[0.4px]">
                  {recordedTitle}
                </h3>
                <p className="mx-auto mt-1.5 max-w-[360px] text-[14px] font-medium leading-[135%] text-[#898A8D]">
                  {recordedSummary}
                </p>
              </>
            ) : isOutstanding ? (
              <>
                <h3 className="text-[20px] font-bold text-black -tracking-[0.4px] leading-none mb-1">
                  + NGN {formatCurrency(amountPaid)}
                </h3>
                <p className="text-[14px] text-[#898A8D] font-medium">
                  Sale recorded partially
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-1.5 mb-0.5 flex-wrap">
                  <h3 className="text-[20px] font-bold text-black -tracking-[0.4px] leading-none">
                    {isConfirmed ? '+ ' : ''}NGN{' '}
                    {formatCurrency(sale.amount || 0)}
                  </h3>
                  {merchantStatus === 'Paid' || isUnconfirmed ? null : (
                    <StatusBadge status={merchantStatus} />
                  )}
                </div>
                <p className="text-[14px] text-[#898A8D] font-medium">
                  {isUnconfirmed
                    ? 'Waiting for confirmation'
                    : 'Sale recorded successfully'}
                </p>
              </>
            )}
          </div>

          {/* Action Buttons */}
          {justRecorded ? (
            <div className="scrollbar-hide mb-6 flex w-full gap-2 overflow-x-auto px-1">
              <Button
                variant="outline"
                className="h-9 w-fit shrink-0 rounded-full border border-[#0000000A] bg-[#F1F1F1] px-3.5 text-[10px] font-bold tracking-[1px] text-black shadow-[0px_2px_4px_0px_#0000000A]"
                onClick={
                  isOutstanding ? handleRecordRepayment : handleShareReceipt
                }
              >
                {isOutstanding ? <PlusCircle size={16} /> : <Share size={16} />}
                {isOutstanding ? 'RECORD REPAYMENT' : 'SHARE RECEIPT'}
              </Button>
              <Button
                variant="outline"
                className="h-9 w-fit shrink-0 rounded-full border border-[#0000000A] bg-[#F1F1F1] px-3.5 text-[10px] font-bold tracking-[1px] text-black shadow-[0px_2px_4px_0px_#0000000A]"
                onClick={() => {
                  if (isOutstanding) {
                    openDrawer({ type: 'send-reminder', props: { sale } })
                    return
                  }
                  closeDrawer()
                  router.push(`/record-sale?id=${sale._id}&edit=true`)
                }}
              >
                {isOutstanding ? <Bell size={16} /> : <PencilLine size={16} />}
                {isOutstanding ? 'SEND REMINDER' : 'EDIT SALE'}
              </Button>
              <Button
                variant="outline"
                className="h-9 w-fit shrink-0 rounded-full border border-[#0000000A] bg-[#F1F1F1] px-3.5 text-[10px] font-bold tracking-[1px] text-black shadow-[0px_2px_4px_0px_#0000000A]"
                onClick={() =>
                  openDrawer({ type: 'confirm-archive', props: { sale } })
                }
              >
                <Archive size={16} />
                ARCHIVE SALE
              </Button>
            </div>
          ) : isOutstanding ? (
            <div className="flex gap-2 justify-center mb-6 w-full px-1">
              <Button
                variant="outline"
                className="w-fit rounded-full h-9 bg-[#F1F1F1] border border-[#0000000A] px-3.5 text-[10px] font-bold text-black tracking-[1px] hover:bg-[#F1F1F1]/80 transition-colors flex items-center justify-center gap-1.5 shadow-[0px_2px_4px_0px_#0000000A]"
                onClick={handleRecordRepayment}
              >
                <PlusCircle size={16} className="text-black" />
                RECORD REPAYMENT
              </Button>
              <Button
                variant="outline"
                className="w-fit rounded-full h-9 bg-[#F1F1F1] border border-[#0000000A] px-3.5 text-[10px] font-bold text-black tracking-[1px] hover:bg-[#F1F1F1]/80 transition-colors flex items-center justify-center gap-1.5 shadow-[0px_2px_4px_0px_#0000000A]"
                onClick={() => {
                  openDrawer({
                    type: 'send-reminder',
                    props: { sale },
                  })
                }}
              >
                <Bell size={16} className="text-black" />
                SEND REMINDER
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 justify-center mb-6 w-full">
              <Button
                variant="outline"
                className="w-fit rounded-full h-9 bg-[#F1F1F1] border border-[#0000000A] px-3.5 text-[10px] font-bold text-black tracking-[1px] hover:bg-[#F1F1F1]/80 transition-colors flex items-center justify-center gap-1.5 shadow-[0px_2px_4px_0px_#0000000A]"
                onClick={handleShareReceipt}
              >
                <Share size={16} className="text-black" />
                SHARE RECEIPT
              </Button>
              <Button
                variant="outline"
                className="w-fit rounded-full h-9 bg-[#F1F1F1] border border-[#0000000A] px-3.5 text-[10px] font-bold text-black tracking-[1px] hover:bg-[#F1F1F1]/80 transition-colors flex items-center justify-center gap-1.5 shadow-[0px_2px_4px_0px_#0000000A]"
                onClick={() => window.print()}
              >
                <Download size={16} className="text-black" />
                DOWNLOAD RECEIPT
              </Button>
            </div>
          )}

          {/* First Details Card Section */}
          <div className="w-full border border-[#F1F1F1] rounded-[12px] bg-white p-5 space-y-4">
            {isOutstanding ? (
              <>
                {/* Status */}
                <div className="flex justify-between items-center border-b border-[#F1F1F1] pb-4">
                  <span className="text-[14px] text-[#00000080] font-normal">
                    Status
                  </span>
                  <div className="flex items-center gap-0.5">
                    <ClockFillIcon size={20} />
                    <span
                      className="text-[14px] font-medium"
                      style={{
                        background:
                          'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Owing
                    </span>
                  </div>
                </div>

                {/* Amount paid */}
                <div className="flex justify-between items-center">
                  <span className="text-[14px] text-[#00000080] font-normal">
                    Amount paid
                  </span>
                  <span className="text-[14px] font-medium text-black">
                    NGN {formatCurrency(amountPaid)}
                  </span>
                </div>

                {/* Outstanding */}
                <div className="flex justify-between items-center">
                  <span className="text-[14px] text-[#00000080] font-normal">
                    Outstanding
                  </span>
                  <span
                    className="text-[14px] font-medium "
                    style={{
                      background:
                        'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    NGN {formatCurrency(sale.balanceOwed || 0)}
                  </span>
                </div>

                {/* Description */}
                <div className="flex justify-between items-center">
                  <span className="text-[14px] text-[#00000080] font-normal">
                    Description
                  </span>
                  <span className="text-[14px] font-medium text-black truncate max-w-50 capitalize">
                    {getSaleDescription(sale)}
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* Status */}
                <div className="flex justify-between items-center border-b border-[#F1F1F1] pb-4">
                  <span className="text-[14px] text-[#00000080] font-normal">
                    Status
                  </span>
                  <div className="flex items-center gap-1">
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center',
                        isArchived
                          ? 'bg-[#9CA3AF]'
                          : isUnconfirmed
                            ? 'bg-[#BB8123]'
                            : 'bg-[#24C166]',
                      )}
                    >
                      {isUnconfirmed ? (
                        <Loader2 className="w-2.5 h-2.5 text-white stroke-[3px] animate-spin" />
                      ) : (
                        <Check className="w-2.5 h-2.5 text-white stroke-[3.5px]" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[14px] font-medium',
                        isArchived
                          ? 'text-[#9CA3AF]'
                          : isUnconfirmed
                            ? 'text-[#BB8123]'
                            : 'text-[#24C166]',
                      )}
                    >
                      {merchantStatus}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex justify-between items-center">
                  <span className="text-[14px] text-[#00000080] font-normal">
                    Amount
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-medium text-black">
                      NGN {formatCurrency(sale.amount || 0)}
                    </span>
                    {isArchived ? (
                      <div className="w-5 h-5 rounded-full bg-[#9CA3AF] flex items-center justify-center text-white shrink-0">
                        <Archive size={10} strokeWidth={2.5} />
                      </div>
                    ) : sale.hasBeenEdited ? (
                      <div className="w-5 h-5 rounded-full bg-[#000000]/40 flex items-center justify-center text-white shrink-0">
                        <PencilLine size={10} strokeWidth={2.5} />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Description */}
                <div className="flex justify-between items-center">
                  <span className="text-[14px] text-[#00000080] font-normal">
                    Description
                  </span>
                  <span className="text-[14px] font-medium text-black truncate max-w-50 capitalize">
                    {getSaleDescription(sale)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Second Details Section with Border */}
          <div className="w-full border border-[#F1F1F1] rounded-[12px] bg-white p-5 space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Customer
              </span>
              {isOutstanding ? (
                <div className="flex items-center gap-1">
                  <span className="text-[14px] font-medium text-black">
                    {customerName}
                  </span>
                  <ChevronRight size={16} className="text-black" />
                </div>
              ) : (
                <span className="text-[14px] font-medium text-black">
                  {customerName}
                </span>
              )}
            </div>

            {/* Date and time */}
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Date and time
              </span>
              <span className="text-[14px] font-medium text-black">
                {formatDate(
                  sale.createdAt || sale.recordedAt || (sale as any).date,
                )}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Via
              </span>
              <span className="text-[14px] font-medium text-black">
                {sale.qrKitName
                  ? `${sale.qrKitName}`
                  : sale.serialNumber || 'N/A'}
              </span>
            </div>

            {/* Payment method */}
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Payment method
              </span>
              <span className="text-[14px] font-medium text-black">
                {sale.paymentMethod || 'Other'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Reference
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-black truncate max-w-[150px]">
                  {sale.reference ||
                    sale._id?.substring(0, 10).toUpperCase() ||
                    'N/A'}
                </span>
                <button
                  onClick={() => {
                    const ref = sale.reference || sale._id
                    if (ref) {
                      navigator.clipboard.writeText(ref)
                    }
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <Copy size={16} className="text-[#9CA3AF]" />
                </button>
              </div>
            </div>
          </div>

          <TagFooter />
        </div>
      </div>
    </div>
  )
}

export { TransactionDetailsDrawer }
