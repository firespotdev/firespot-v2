'use client'

import {
  Share,
  Download,
  Copy,
  ArrowLeft,
  PencilLine,
  MoreVertical,
  Archive,
  Check,
  Mail,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button, TagFooter, StatusBadge, CircularIconButton } from '../ui'
import { format } from 'date-fns'
import { useDrawerStore } from '@/services/drawer'
import { Sale } from '@/services/sales/interface'

import { cn, formatCurrency } from '@/lib/utils'

interface TransactionDetailsDrawerProps {
  sale: Sale
  onClose: () => void
}

const TransactionDetailsDrawer = ({ sale }: TransactionDetailsDrawerProps) => {
  const router = useRouter()
  const { openDrawer, closeDrawer } = useDrawerStore()

  if (!sale) return null

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A'
    try {
      return format(new Date(date), 'MMMM do, yyyy . h:mm a')
    } catch (e) {
      return String(date)
    }
  }

  const isOutstanding =
    sale.status === 'OUTSTANDING' ||
    (sale.balanceOwed !== undefined && sale.balanceOwed > 0 && !sale.isPaidInFull)
  const isConfirmed = !isOutstanding && (sale.status === 'CONFIRMED' || !sale.status)
  const isArchived = (sale as any).isArchived

  const handleRecordRepayment = () => {
    try {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.bprogress) {
        // @ts-ignore
        window.bprogress.start()
      }
    } catch (e) {}
    closeDrawer()
    router.push(`/record-repayment?id=${sale._id}`)
  }

  return (
    <div className="flex flex-col h-full font-satoshi bg-white">
      {/* Header */}
      <div className="shrink-0 p-3 text-black border-b border-[#f1f1f1] w-full text-center flex justify-between items-center bg-white">
        <CircularIconButton
          icon="arrow-left"
          size="sm"
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
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center pt-8 px-4">
          {/* Status Icon */}
          <div
            className={cn(
              'w-[64px] h-[64px] rounded-full border-4 flex items-center justify-center mb-4 bg-white shrink-0',
              isArchived
                ? 'border-[#D1D5DB]'
                : isOutstanding
                  ? 'border-[#BB8123]'
                  : 'border-[#24C166]',
            )}
          >
            <Check
              className={
                isArchived
                  ? 'text-[#D1D5DB]'
                  : isOutstanding
                    ? 'text-[#BB8123]'
                    : 'text-[#24C166]'
              }
              size={32}
              strokeWidth={3}
            />
          </div>

          {/* Amount and Status Message */}
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5 flex-wrap">
              <h3 className="text-[20px] font-bold text-black -tracking-[0.4px] leading-none">
                {isConfirmed ? '+ ' : ''}NGN {formatCurrency(sale.amount || 0)}
              </h3>
              {isArchived ? (
                <StatusBadge status="ARCHIVED" />
              ) : isOutstanding ? (
                <StatusBadge status="OUTSTANDING" />
              ) : sale.hasBeenEdited ? (
                <StatusBadge status="EDITED" />
              ) : null}
            </div>
            <p className="text-[14px] text-[#898A8D] font-medium">
              {isOutstanding
                ? `Balance owed: NGN ${formatCurrency(sale.balanceOwed || 0)}`
                : 'Sale recorded successfully'}
            </p>
          </div>

          {/* Action Buttons */}
          {isOutstanding ? (
            <div className="flex gap-2 justify-center mb-6 w-full px-4">
              <Button
                variant="default"
                className="flex-1 rounded-full h-11 bg-black hover:bg-black/90 text-white px-4 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                onClick={handleRecordRepayment}
              >
                RECORD REPAYMENT
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-full h-11 bg-[#F1F1F1] border-none px-4 text-xs font-bold text-black hover:bg-[#F1F1F1]/80 transition-colors flex items-center justify-center gap-1.5"
                onClick={() => {
                  openDrawer({
                    type: 'send-reminder',
                    props: { sale },
                  })
                }}
              >
                <Mail size={16} className="text-black" />
                SEND REMINDER
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 justify-center mb-6 w-full">
              <Button
                variant="outline"
                className="w-fit rounded-full h-9 bg-[#F1F1F1] border-none px-[14px] text-[10px] font-bold text-black tracking-[1px] hover:bg-[#F1F1F1]/80 transition-colors flex items-center justify-center gap-1.5"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Firespot Receipt',
                      text: `Receipt for payment of NGN ${formatCurrency(sale.amount || 0)} on ${formatDate(sale.createdAt)}`,
                      url: window.location.href,
                    })
                  }
                }}
              >
                <Share size={16} className="text-black" />
                SHARE RECEIPT
              </Button>
              <Button
                variant="outline"
                className="w-fit rounded-full h-9 bg-[#F1F1F1] border-none px-[14px] text-[10px] font-bold text-black tracking-[1px] hover:bg-[#F1F1F1]/80 transition-colors flex items-center justify-center gap-1.5"
                onClick={() => window.print()}
              >
                <Download size={16} className="text-black" />
                DOWNLOAD RECEIPT
              </Button>
            </div>
          )}


          {/* Details Section with Border */}
          <div className="w-full border border-[#F1F1F1] rounded-2xl bg-white p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#F1F1F1] pb-4">
              <span className="text-[14px] text-[#00000080] font-normal">
                Status
              </span>
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center',
                    isArchived ? 'bg-[#D1D5DB]' : 'bg-[#24C166]',
                  )}
                >
                  <Check className="w-2.5 h-2.5 text-white stroke-[3.5px]" />
                </div>
                <span
                  className={cn(
                    'text-[14px] font-medium',
                    isArchived ? 'text-[#9CA3AF]' : 'text-[#24C166]',
                  )}
                >
                  Confirmed
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
                  <div className="w-5 h-5 rounded-full bg-[#FF002E] flex items-center justify-center text-white shrink-0">
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
              <span className="text-[14px] font-medium text-black truncate max-w-[200px] capitalize">
                {sale.description || 'No description'}
              </span>
            </div>
          </div>

          {/* Second Details Section with Border */}
          <div className="w-full border border-[#F1F1F1] rounded-2xl bg-white p-5 space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Customer
              </span>
              <span className="text-[14px] font-medium text-black">
                {sale.customerType === 'Repeat'
                  ? `Repeat (${sale.customerPurchaseCount || 1} purchases)`
                  : 'New'}
              </span>
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
                {sale.qrKitName || sale.serialNumber}
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
