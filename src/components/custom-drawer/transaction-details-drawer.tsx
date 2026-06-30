'use client'

import { useState } from 'react'
import {
  X,
  CircleCheck,
  Share,
  Download,
  Copy,
  ArrowLeft,
  PencilLine,
  MoreVertical,
  Archive,
  Check,
} from 'lucide-react'
import { Button, TagFooter } from '../ui'
import { format } from 'date-fns'
import Link from 'next/link'
import { useDrawerStore } from '@/services/drawer'
import { Sale } from '@/services/sales/interface'
import { formatCurrency } from '@/lib/utils'
import { useArchiveSale } from '@/services/sales/hooks'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '../ui/drawer'

interface TransactionDetailsDrawerProps {
  sale: Sale
  onClose: () => void
}

const TransactionDetailsDrawer = ({
  sale: initialSale,
  onClose,
}: TransactionDetailsDrawerProps) => {
  const { closeDrawer } = useDrawerStore()
  const archiveSaleMutation = useArchiveSale()
  const [sale, setSale] = useState<Sale>(initialSale)
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
  const [isConfirmArchiveOpen, setIsConfirmArchiveOpen] = useState(false)

  if (!sale) return null

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A'
    try {
      return format(new Date(date), 'MMMM do, yyyy . h:mm a')
    } catch (e) {
      return String(date)
    }
  }

  const handleArchive = () => {
    setIsConfirmArchiveOpen(false)
    setIsOptionsOpen(false)
    archiveSaleMutation.mutate(sale._id, {
      onSuccess: (updated) => {
        setSale(updated)
      },
      onError: (err) => {
        alert('Failed to archive sale')
      },
    })
  }

  const isConfirmed = sale.status === 'CONFIRMED' || !sale.status
  const isArchived = (sale as any).isArchived

  const creationDate = new Date(
    sale.createdAt || sale.recordedAt || Date.now(),
  ).getTime()
  const isEditWindowOpen =
    !sale.hasBeenEdited && Date.now() - creationDate <= 24 * 60 * 60 * 1000
  const isEditable = isConfirmed && isEditWindowOpen && !isArchived

  return (
    <div className="flex flex-col h-full font-satoshi bg-white">
      {/* Header */}
      <div className="shrink-0 p-3 text-black border-b border-[#f1f1f1] w-full text-center flex justify-between items-center bg-white">
        <button
          onClick={closeDrawer}
          className="w-6 h-6 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-base font-bold">Transaction details</h2>
        <button
          onClick={() => setIsOptionsOpen(true)}
          className="w-6 h-6 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors text-black"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center pt-8 px-4">
          {/* Status Icon */}
          <div className="mb-4">
            <CircleCheck
              size={76}
              strokeWidth={1.5}
              fill={isArchived ? '#FF3B30' : '#24C166'}
              className="text-white"
            />
          </div>

          {/* Amount and Status Message */}
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <h3 className="text-[24px] font-bold text-black -tracking-[0.4px] leading-none">
                {isConfirmed ? '+ ' : ''}NGN {formatCurrency(sale.amount || 0)}
              </h3>
              {sale.hasBeenEdited && (
                <span className="text-[10px] font-bold rounded-full bg-[#E5E7EB] text-[#4B5563] py-0.5 px-2">
                  Edited
                </span>
              )}
              {isArchived && (
                <span className="text-[10px] font-bold rounded-full bg-[#FF3B30] text-white py-0.5 px-2">
                  Archived
                </span>
              )}
            </div>
            <p className="text-[14px] text-[#898A8D] font-medium">
              {isArchived
                ? 'Sale archived successfully'
                : 'Sale recorded successfully'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6 w-full">
            <Button
              variant="outline"
              className="flex-1 rounded-full h-10 bg-[#F1F1F1] border-transparent px-4 text-xs font-bold text-black tracking-[0.5px] hover:bg-[#E5E7EB]"
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
              <Share size={14} className="mr-1.5" />
              SHARE RECEIPT
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-full h-10 bg-[#F1F1F1] border-transparent px-4 text-xs font-bold text-black tracking-[0.5px] hover:bg-[#E5E7EB]"
              onClick={() => window.print()}
            >
              <Download size={14} className="mr-1.5" />
              DOWNLOAD RECEIPT
            </Button>
          </div>

          {/* Details Section with Border */}
          <div className="w-full border border-[#F1F1F1] rounded-2xl bg-white p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#F1F1F1] pb-4">
              <span className="text-[14px] text-[#00000080] font-normal">
                Status
              </span>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center bg-[#24C166]">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                </div>
                <span className="text-[14px] font-medium text-[#24C166]">
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
                  <div className="w-5 h-5 rounded-full bg-[#FF3B30] flex items-center justify-center text-white">
                    <Archive size={10} strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[#4B5563]">
                    <PencilLine size={10} strokeWidth={2.5} />
                  </div>
                )}
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

      {/* Options Menu Drawer */}
      <Drawer open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
        <DrawerContent className="max-w-125 mx-auto rounded-t-[32px] p-6 font-satoshi bg-white">
          <DrawerHeader className="p-0 mb-4 flex justify-between items-center">
            <DrawerTitle className="text-base font-bold text-black">
              Select an option
            </DrawerTitle>
            <DrawerClose className="p-1 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-[#8E8E93]" />
            </DrawerClose>
          </DrawerHeader>

          <div className="flex flex-col gap-3">
            {/* Share receipt */}
            <button
              onClick={() => {
                setIsOptionsOpen(false)
                if (navigator.share) {
                  navigator.share({
                    title: 'Firespot Receipt',
                    url: window.location.href,
                  })
                }
              }}
              className="w-full flex items-center gap-3 p-4 border border-[#E9EBED] rounded-xl hover:bg-gray-50 text-left font-bold text-sm text-black"
            >
              <Share size={18} /> Share receipt
            </button>

            {/* Download receipt */}
            <button
              onClick={() => {
                setIsOptionsOpen(false)
                window.print()
              }}
              className="w-full flex items-center gap-3 p-4 border border-[#E9EBED] rounded-xl hover:bg-gray-50 text-left font-bold text-sm text-black"
            >
              <Download size={18} /> Download receipt
            </button>

            {/* Edit sale */}
            <Link
              href={`/record-sale?id=${sale._id}&edit=true`}
              onClick={() => {
                setIsOptionsOpen(false)
                closeDrawer()
              }}
              className={`w-full flex items-center gap-3 p-4 border rounded-xl text-left font-bold text-sm ${
                isEditable
                  ? 'border-[#E9EBED] text-black hover:bg-gray-50'
                  : 'border-gray-100 text-[#D1D5DB] cursor-not-allowed'
              }`}
            >
              <PencilLine size={18} /> Edit sale
            </Link>

            {/* Archive sale */}
            <button
              onClick={() => {
                if (isArchived) return
                setIsConfirmArchiveOpen(true)
              }}
              className={`w-full flex items-center gap-3 p-4 border rounded-xl text-left font-bold text-sm ${
                isArchived
                  ? 'border-gray-100 text-red-300 cursor-not-allowed'
                  : 'border-red-100 text-[#FF3B30] hover:bg-red-50'
              }`}
            >
              <Archive size={18} /> Archive sale
            </button>
          </div>
          <TagFooter />
        </DrawerContent>
      </Drawer>

      {/* Confirm Archive Alert Drawer */}
      <Drawer
        open={isConfirmArchiveOpen}
        onOpenChange={setIsConfirmArchiveOpen}
      >
        <DrawerContent className="max-w-125 mx-auto rounded-t-[32px] p-6 font-satoshi bg-white">
          <DrawerHeader className="p-0 mb-4 flex justify-between items-center">
            <DrawerTitle className="text-base font-bold text-black">
              Confirm Archive
            </DrawerTitle>
            <DrawerClose className="p-1 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-[#8E8E93]" />
            </DrawerClose>
          </DrawerHeader>

          <div className="flex flex-col gap-6 text-center">
            <p className="text-sm font-medium text-[#00000080]">
              Are you sure you want to archive this transaction? This action
              will mark the transaction as archived and cannot be undone.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={() => setIsConfirmArchiveOpen(false)}
                variant="outline"
                className="flex-1 h-12 rounded-full font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleArchive}
                className="flex-1 h-12 bg-[#FF3B30] hover:bg-[#E03126] text-white font-bold rounded-full"
              >
                Confirm Archive
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export { TransactionDetailsDrawer }
