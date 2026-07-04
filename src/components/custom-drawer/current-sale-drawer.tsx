'use client'

import { useRef } from 'react'
import { ChevronDown, Minus, ChevronRight } from 'lucide-react'
import { useDrawerStore } from '@/services/drawer'

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

interface Props {
  cartItems: CartItem[]
  onClear: () => void
  onUpdateQty: (id: string, delta: number) => void
  paymentMethod: string
  installmentType: 'full' | 'part'
  amountPaid: number
  hasSetInstallment?: boolean
  customer: any
  totalAmount: number
  dueDate?: string
  onEditPaymentMethod: () => void
  onEditInstallment: () => void
  onEditCustomer: () => void
  onEditDueDate?: (dueDate: string) => void
  onConfirmRecord: () => void
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
  onEditPaymentMethod,
  onEditInstallment,
  onEditCustomer,
  onEditDueDate,
  onConfirmRecord,
}: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const formatDueDate = (dateInput: any) => {
    if (!dateInput) return ''
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return ''
    const day = date.getDate()
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()

    let suffix = 'th'
    if (day === 1 || day === 21 || day === 31) suffix = 'st'
    else if (day === 2 || day === 22) suffix = 'nd'
    else if (day === 3 || day === 23) suffix = 'rd'

    return `${day}${suffix} ${month}, ${year}`
  }

  const getSubtotal = () => {
    return cartItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0)
  }

  const getVAT = () => {
    return Math.round(getSubtotal() * 0.075)
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val)
  }

  const balanceOwed = Math.max(0, totalAmount - amountPaid)

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
      <div className="-mx-3 px-3 flex-1 overflow-y-auto max-h-[220px] mb-4 border-b border-[#F4F6F8] bg-[#FCFBFB]">
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
            NGN {formatCurrency(getSubtotal())}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm text-[#6B7280] font-medium">
          <span>VAT (7.5%)</span>
          <span className="font-medium text-[#111827]">
            NGN {formatCurrency(getVAT())}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm border-t border-[#F4F6F8] font-bold text-[#111827] py-4">
          <span>Total</span>
          <span>NGN {formatCurrency(totalAmount)}</span>
        </div>
      </div>

      {/* Checkout Metadata fields (Clickable to edit) */}
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
                  NGN {formatCurrency(installmentType === 'full' ? totalAmount : amountPaid)}
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
                    className={`text-sm font-medium ${balanceOwed > 0 ? 'text-[#D97706]' : 'text-[#111827]'}`}
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
              {paymentMethod}
            </span>
            <ChevronRight className="w-4 h-4 text-[#00000080]" />
          </div>
        </button>

        {/* Customer */}
        {customer && (
          <button
            onClick={onEditCustomer}
            className="flex justify-between items-center hover:opacity-85 transition-opacity"
          >
            <span className="text-sm text-[#00000080] font-medium">Customer</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-[#111827]">
                {customer.name}
              </span>
              <ChevronRight className="w-4 h-4 text-[#00000080]" />
            </div>
          </button>
        )}

        {/* Due Date */}
        {balanceOwed > 0 && (
          <>
            <input
              type="date"
              ref={dateInputRef}
              className="hidden"
              value={dueDate || ''}
              onChange={(e) => {
                if (onEditDueDate) {
                  onEditDueDate(e.target.value)
                }
              }}
            />
            <button
              onClick={() => {
                if (dateInputRef.current) {
                  if (typeof dateInputRef.current.showPicker === 'function') {
                    dateInputRef.current.showPicker()
                  } else {
                    dateInputRef.current.click()
                  }
                }
              }}
              className="flex justify-between items-center hover:opacity-85 transition-opacity"
            >
              <span className="text-sm text-[#00000080] font-medium">
                Balance due by
              </span>
              <div className="flex items-center gap-1">
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
          </>
        )}
      </div>

      {/* Main record button */}
      <button
        onClick={onConfirmRecord}
        className="w-full h-12 bg-black hover:bg-black/90 active:bg-black/85 text-white font-bold mb-4 rounded-full text-sm tracking-[0.2px] transition-all mt-2 shrink-0"
      >
        Record NGN {formatCurrency(amountPaid)}
      </button>
    </div>
  )
}
