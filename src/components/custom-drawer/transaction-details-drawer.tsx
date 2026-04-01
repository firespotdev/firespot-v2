import {
  X,
  CircleCheck,
  Share,
  Download,
  Copy,
  ArrowLeft,
  PencilLine,
} from 'lucide-react'
import { Button, TagFooter } from '../ui'
import { format } from 'date-fns'
import Link from 'next/link'
import { useDrawerStore } from '@/services/drawer'
import { Sale } from '@/services/sales/interface'

interface TransactionDetailsDrawerProps {
  sale: Sale
  onClose: () => void
}

const TransactionDetailsDrawer = ({
  sale,
  onClose,
}: TransactionDetailsDrawerProps) => {
  const { closeDrawer, openDrawer } = useDrawerStore()
  if (!sale) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG').format(amount)
  }

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A'
    try {
      return format(new Date(date), 'MMMM do, yyyy . h:mm a')
    } catch (e) {
      return String(date)
    }
  }

  const isConfirmed = sale.status === 'CONFIRMED' || !sale.status // Treat as confirmed if status is missing but we're showing details

  const creationDate = new Date(
    sale.createdAt || sale.recordedAt || Date.now(),
  ).getTime()
  const isEditWindowOpen =
    !sale.hasBeenEdited && Date.now() - creationDate <= 24 * 60 * 60 * 1000
  const isEditable = isConfirmed && isEditWindowOpen

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 p-3 text-black border-b border-[#f1f1f1] w-full text-center flex justify-between items-center">
        <button
          onClick={closeDrawer}
          className="w-6 h-6 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-base font-bold">Transaction details</h2>
        {isEditable ? (
          <Link
            href={`/record-sale?id=${sale._id}&edit=true`}
            onClick={closeDrawer}
            className="w-6 h-6 flex items-center justify-center rounded-full transition-colors text-black"
          >
            <PencilLine size={20} />
          </Link>
        ) : (
          <div className="w-6 h-6 flex items-center justify-center rounded-full text-[#D1D5DB] cursor-not-allowed">
            <PencilLine size={20} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center pt-8 px-4">
          {/* Status Icon */}
          <div className="mb-4">
            <CircleCheck
              size={76}
              strokeWidth={1.2}
              className="text-[#24C166]"
            />
          </div>

          {/* Amount and Status Message */}
          <div className="mb-6 text-center">
            {isEditable ? (
              <h3 className="text-[20px] font-bold text-black -tracking-[0.4px] leading-[100%]">
                {isConfirmed ? '+ ' : ''}NGN {formatCurrency(sale.amount || 0)}
              </h3>
            ) : (
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="text-[20px] font-bold text-black -tracking-[0.4px] leading-[100%]">
                  {isConfirmed ? '+ ' : ''}NGN{' '}
                  {formatCurrency(sale.amount || 0)}
                </h3>
                <span className="text-[10px] font-bold rounded-[10px] bg-[#00000040] text-white py-0.5 px-2">
                  Edited
                </span>
              </div>
            )}
            <p className="text-[14px] text-[#898A8D] font-medium">
              Sale recorded successfully
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <Button
              variant="outline"
              className="flex-1 rounded-full h-9 bg-[#F1F1F1] border-transparent px-4 py-[10px] text-[10px] font-bold text-black tracking-[1px] hover:bg-[#E5E7EB]"
              onClick={() => {}}
            >
              <Share size={14} />
              SHARE RECEIPT
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-full h-9 bg-[#F1F1F1] border-transparent px-4 py-[10px] text-[10px] font-bold text-black tracking-[1px] hover:bg-[#E5E7EB]"
              onClick={() => {}}
            >
              <Download size={14} />
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
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="8" cy="8" r="8" fill="#24C166" />
                  <path
                    d="M5 8.5L7 10.5L11 6.5"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
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
              <span className="text-[14px] font-medium text-black">
                NGN {formatCurrency(sale.amount || 0)}
              </span>
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
