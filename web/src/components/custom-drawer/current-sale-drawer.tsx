'use client'

import { useState } from 'react'
import { ChevronDown, Minus, ChevronRight, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useDrawerStore } from '@/services/drawer'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  selectedVariant?: {
    size?: string
    color?: string
  }
}

interface SaleCustomer {
  name?: string
}

interface Props {
  cartItems: CartItem[]
  onClear: () => void
  onUpdateQty: (id: string, delta: number) => void
  paymentMethod: string
  installmentType: 'full' | 'part'
  amountPaid: number
  hasSetInstallment?: boolean
  customer: SaleCustomer | null
  totalAmount: number
  dueDate?: string
  mode?: 'record' | 'collect' | 'preview'
  isLoading?: boolean
  onEditPaymentMethod: () => void
  onEditInstallment: () => void
  onEditCustomer: () => void
  onEditDueDate?: (dueDate: string) => void
  onConfirmRecord: () => void | Promise<void>
}

export function CurrentSaleDrawer({
  cartItems,
  onClear,
  onUpdateQty,
  paymentMethod,
  installmentType,
  amountPaid,
  hasSetInstallment = false,
  customer,
  totalAmount,
  dueDate,
  mode = 'record',
  isLoading = false,
  onEditPaymentMethod,
  onEditInstallment,
  onEditCustomer,
  onEditDueDate,
  onConfirmRecord,
}: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const [dueDateOpen, setDueDateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const formatDueDate = (dateInput: string | Date) => {
    if (!dateInput) return ''
    const date =
      typeof dateInput === 'string'
        ? new Date(`${dateInput.slice(0, 10)}T00:00:00`)
        : new Date(dateInput)
    if (isNaN(date.getTime())) return ''
    return format(date, 'do MMMM, yyyy')
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val)
  }

  const balanceOwed = Math.max(0, totalAmount - amountPaid)
  const needsPaymentMethod = mode === 'record' && !paymentMethod
  const selectedDueDate = dueDate
    ? new Date(`${dueDate.slice(0, 10)}T00:00:00`)
    : undefined
  const isPending = isLoading || isSubmitting
  const isContinueDisabled =
    isPending || needsPaymentMethod || (installmentType === 'part' && !customer)

  const handleContinue = async () => {
    if (isContinueDisabled) return
    setIsSubmitting(true)
    try {
      await onConfirmRecord()
    } finally {
      setIsSubmitting(false)
    }
  }

  const gradientStyle = {
    background: 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
  }

  return (
    <div className="w-full flex flex-col font-satoshi px-3 bg-white max-w-125 mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0 py-2">
        <button
          onClick={closeDrawer}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center text-black"
        >
          <ChevronDown className="w-6 h-6 stroke-[2.5px]" />
        </button>
        <span className="text-[16px] font-bold text-black inline-block">
          Current sale ({cartItems.length})
        </span>
        <button
          onClick={() => {
            onClear()
            closeDrawer()
          }}
          className="text-xs font-medium text-black underline underline-offset-4 hover:opacity-80"
        >
          Clear
        </button>
      </div>

      {/* Items list */}
      <div className="-mx-3 px-3 flex-1 overflow-y-auto max-h-55 mb-4 border-b border-[#F4F6F8] bg-[#FCFBFB]">
        {cartItems.length >= 1 ? (
          <div className="flex flex-col gap-3.5 py-4">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div className="flex flex-col text-left">
                  <span className="text-[14px] font-bold text-[#6B7280]">
                    {item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}
                  </span>
                  {item.selectedVariant && (
                    <span className="text-[11px] text-[#8E8E93] font-medium mt-0.5">
                      {item.selectedVariant.size &&
                        `Size: ${item.selectedVariant.size}`}
                      {item.selectedVariant.size &&
                        item.selectedVariant.color &&
                        ' . '}
                      {item.selectedVariant.color &&
                        `Color: ${item.selectedVariant.color}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[14px] font-bold text-[#111827]">
                    NGN {formatCurrency(item.price * item.quantity)}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.id, -1)}
                    className="w-9 h-9 rounded-[10px] bg-[#F1F1F1] hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-black transition-colors"
                  >
                    <Minus className="w-4 h-4 stroke-[2px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Financial calculations */}
      <div className="flex flex-col gap-3 border-b border-[#F4F6F8] shrink-0 text-left">
        <div className="flex justify-between items-center text-sm text-[#6B7280] font-medium">
          <span>Subtotal</span>
          <span className="font-medium text-[#111827]">
            NGN {formatCurrency(totalAmount)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm border-t border-[#F4F6F8] font-bold text-[#111827] py-4">
          <span>Total</span>
          <span>NGN {formatCurrency(totalAmount)}</span>
        </div>
      </div>

      {/* Checkout Metadata fields (Clickable to edit) */}
      {mode === 'record' && (
        <div className="flex flex-col gap-3 py-4 shrink-0 text-left">
          {/* Paid now / Paid in full (Only display when set) */}
          {hasSetInstallment && (
            <>
              <button
                onClick={onEditInstallment}
                className="flex justify-between items-center hover:opacity-85 transition-opacity"
              >
                <span className="text-sm text-[#00000080] font-medium">
                  {installmentType === 'full' ? 'Paid in full' : 'Paid now'}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-[#24C166]">
                    NGN{' '}
                    {formatCurrency(
                      installmentType === 'full' ? totalAmount : amountPaid,
                    )}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#00000080]" />
                </div>
              </button>

              {/* Outstanding */}
              {installmentType !== 'full' && (
                <button
                  onClick={onEditInstallment}
                  className="flex justify-between items-center hover:opacity-85 transition-opacity"
                >
                  <span className="text-sm text-[#00000080] font-medium">
                    Outstanding
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-sm font-medium`}
                      style={gradientStyle}
                    >
                      NGN {formatCurrency(balanceOwed)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#00000080]" />
                  </div>
                </button>
              )}
            </>
          )}

          {/* Payment method */}
          <button
            onClick={onEditPaymentMethod}
            className="flex justify-between items-center hover:opacity-85 transition-opacity"
          >
            <span className="text-sm text-[#00000080] font-medium">Method</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-[#111827] capitalize">
                {paymentMethod || 'Not selected'}
              </span>
              <ChevronRight className="w-4 h-4 text-[#00000080]" />
            </div>
          </button>

          {/* Customer */}
          {(customer || installmentType === 'part') && (
            <button
              onClick={onEditCustomer}
              className="flex w-full justify-between items-center hover:opacity-85 transition-opacity"
            >
              <span className="text-sm text-[#00000080] font-medium">
                Customer
              </span>
              <div className="flex items-center gap-1">
                <span
                  className={`text-sm font-medium text-[#111827] ${
                    customer ? '' : 'underline'
                  }`}
                >
                  {customer?.name || 'Select who owes you'}
                </span>
                <ChevronRight className="w-4 h-4 text-[#00000080]" />
              </div>
            </button>
          )}

          {/* Due Date */}
          {balanceOwed > 0 && (
            <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex w-full cursor-pointer justify-between items-center hover:opacity-85 transition-opacity"
                >
                  <span className="text-sm text-[#00000080] font-medium">
                    Balance due by
                  </span>
                  <div className="pointer-events-none flex items-center gap-1">
                    <span
                      className={
                        dueDate
                          ? 'text-sm font-medium text-[#111827]'
                          : 'text-sm font-medium text-[#111827] underline'
                      }
                    >
                      {dueDate ? formatDueDate(dueDate) : 'Set a due date'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#00000080]" />
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end" side="top">
                <Calendar
                  mode="single"
                  selected={selectedDueDate}
                  disabled={{ before: today }}
                  onSelect={(date) => {
                    if (!date) return
                    onEditDueDate?.(format(date, 'yyyy-MM-dd'))
                    setDueDateOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {/* Preview has no checkout action; Record and Collect remain the
          explicit actions on the sale screen. */}
      {mode !== 'preview' && (
        <button
          onClick={handleContinue}
          disabled={isContinueDisabled}
          className="w-full h-12 bg-black hover:bg-black/90 active:bg-black/85 disabled:bg-black/60 disabled:cursor-not-allowed text-white font-bold mb-4 rounded-full text-sm tracking-[0.2px] transition-all mt-2 shrink-0 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Continue</span>
            </>
          ) : (
            <span>Continue</span>
          )}
        </button>
      )}
    </div>
  )
}
