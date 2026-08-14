'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { useDrawerStore } from '@/services/drawer'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Spinner } from '@/components/ui'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
  selectedVariant?: {
    label?: string
    values?: Array<{ optionName?: string; value: string }>
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
    <div className="mx-auto flex max-h-[80dvh] w-full max-w-125 flex-col bg-white font-satoshi">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#F1F1F1] px-4 py-2">
        <button
          onClick={closeDrawer}
          aria-label="Close current sale"
          className="flex h-9 w-9 items-center justify-center text-black"
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
          className="h-9 px-1 text-sm font-medium text-black underline underline-offset-4"
        >
          Clear
        </button>
      </div>

      {/* Items list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {cartItems.length >= 1 ? (
          <div>
            {cartItems.map((item) => {
              const isAmountItem = item.id.startsWith('custom')

              if (isAmountItem) {
                return (
                  <article
                    key={item.id}
                    className="flex items-center gap-3 border-b border-[#F1F1F1] py-4"
                  >
                    <p className="min-w-0 flex-1 truncate text-[14px] font-bold text-[#6B7280]">
                      {item.name}
                    </p>
                    <p className="shrink-0 text-[14px] font-bold text-[#111827]">
                      NGN {formatCurrency(item.price * item.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, -item.quantity)}
                      aria-label={`Remove ${item.name}`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#F1F1F1] text-black"
                    >
                      <Minus size={16} />
                    </button>
                  </article>
                )
              }

              return (
                <article
                  key={item.id}
                  className="border-b border-[#F1F1F1] py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[14px] font-medium text-[#111827]">
                        {item.name}
                      </p>
                      {item.selectedVariant && (
                        <p className="mt-1 truncate text-sm font-medium text-[#6B7280]">
                          {item.selectedVariant.label ||
                            item.selectedVariant.values
                              ?.map((value) => value.value)
                              .join(' / ') ||
                            [
                              item.selectedVariant.size,
                              item.selectedVariant.color,
                            ]
                              .filter(Boolean)
                              .join(' / ')}
                        </p>
                      )}
                    </div>
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[5px] bg-[#F1F1F1]">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[#9CA3AF]">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, -item.quantity)}
                      aria-label={`Remove ${item.name}`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#F1F1F1]"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="flex h-9 items-center rounded-[10px] bg-[#F1F1F1]">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, -1)}
                        aria-label={`Decrease ${item.name} quantity`}
                        className="grid h-9 w-9 place-items-center"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="min-w-8 text-center text-[14px] font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, 1)}
                        aria-label={`Increase ${item.name} quantity`}
                        className="grid h-9 w-9 place-items-center"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <span className="ml-auto shrink-0 text-[14px] font-bold text-[#111827]">
                      NGN {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </div>

      {/* Financial calculations */}
      <div className="shrink-0 space-y-3 border-b border-[#F1F1F1] px-4 py-4 text-left">
        <div className="flex justify-between items-center text-sm text-[#6B7280] font-medium">
          <span>Subtotal</span>
          <span className="font-medium text-[#111827]">
            NGN {formatCurrency(totalAmount)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-[#F1F1F1] pt-4 text-[16px] font-bold text-[#111827]">
          <span>Total</span>
          <span>NGN {formatCurrency(totalAmount)}</span>
        </div>
      </div>

      {/* Checkout Metadata fields (Clickable to edit) */}
      {mode === 'record' && (
        <div className="flex shrink-0 flex-col gap-3 px-4 py-4 text-left">
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
          className="mx-4 mb-[max(1rem,env(safe-area-inset-bottom))] mt-2 flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-black text-sm font-bold tracking-[0.2px] text-white hover:bg-black/90 active:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/60"
        >
          {isPending ? (
            <Spinner />
          ) : (
            <span>
              {mode === 'collect'
                ? `Collect NGN ${formatCurrency(totalAmount)}`
                : 'Continue'}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
