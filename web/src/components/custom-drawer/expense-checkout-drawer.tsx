'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { Spinner } from '@/components/ui'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatCurrency } from '@/lib/utils'
import { useDrawerStore } from '@/services/drawer'
import {
  firstPaymentLimit,
  type ExpenseDraft,
} from '@/components/expenses/use-expense-flow'

interface Props {
  draft: ExpenseDraft
  isEditing?: boolean
  onEditMethod: () => void
  onEditInstallment: () => void
  onEditSupplier: () => void
  onConfirm: (draft: ExpenseDraft) => Promise<void>
}

const OWED_STYLE = {
  background: 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
}

const dateFromInput = (value?: string) =>
  value ? new Date(`${value.slice(0, 10)}T00:00:00`) : undefined

interface RowProps {
  label: string
  onClick: () => void
  children: React.ReactNode
}

function SummaryRow({ label, onClick, children }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between transition-opacity hover:opacity-85"
    >
      <span className="text-sm font-medium text-[#00000080]">{label}</span>
      <span className="flex items-center gap-1">
        {children}
        <ChevronRight className="h-4 w-4 text-[#00000080]" />
      </span>
    </button>
  )
}

export function ExpenseCheckoutDrawer({
  draft,
  isEditing = false,
  onEditMethod,
  onEditInstallment,
  onEditSupplier,
  onConfirm,
}: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const [dueDate, setDueDate] = useState(draft.dueDate)
  const [dueDateOpen, setDueDateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isPart = draft.installment === 'part'
  const repaid = draft.repaid ?? 0
  const paidNow = isPart ? draft.amountPaid : firstPaymentLimit(draft)
  const balanceOwed = Math.max(0, draft.amount - paidNow - repaid)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const handleConfirm = async () => {
    if (isSubmitting || !draft.paymentMethod) return
    setIsSubmitting(true)
    try {
      await onConfirm({ ...draft, dueDate })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-h-[80dvh] w-full max-w-125 flex-col bg-white font-satoshi">
      <div className="flex shrink-0 items-center justify-between border-b border-[#F1F1F1] px-4 py-2">
        <button
          type="button"
          onClick={() => closeDrawer('expense-checkout')}
          aria-label="Close summary"
          className="flex h-9 w-9 items-center justify-center text-black"
        >
          <ChevronDown className="h-6 w-6 stroke-[2.5px]" />
        </button>
        <span className="text-[16px] font-bold text-black">
          {isEditing ? 'Edit expense' : 'New expense'}
        </span>
        <span className="h-9 w-9" aria-hidden />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 border-b border-[#F1F1F1] px-4 py-4 text-left">
          <div className="flex items-center justify-between gap-3 text-sm font-medium text-[#6B7280]">
            <span>Description</span>
            <span className="truncate text-[#111827]">{draft.description}</span>
          </div>
          <div className="flex items-center justify-between border-t border-[#F1F1F1] pt-4 text-[16px] font-bold text-[#111827]">
            <span>Total</span>
            <span>NGN {formatCurrency(draft.amount)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4 text-left">
          <SummaryRow
            label={isPart ? 'Paid now' : 'Paid in full'}
            onClick={onEditInstallment}
          >
            <span className="text-sm font-medium text-[#24C166]">
              NGN {formatCurrency(paidNow)}
            </span>
          </SummaryRow>

          {repaid > 0 && (
            <div className="flex w-full items-center justify-between pr-5">
              <span className="text-sm font-medium text-[#00000080]">
                Repaid since
              </span>
              <span className="text-sm font-medium text-[#24C166]">
                NGN {formatCurrency(repaid)}
              </span>
            </div>
          )}

          {balanceOwed > 0 && (
            <SummaryRow label="Outstanding" onClick={onEditInstallment}>
              <span className="text-sm font-medium" style={OWED_STYLE}>
                NGN {formatCurrency(balanceOwed)}
              </span>
            </SummaryRow>
          )}

          <SummaryRow label="Method" onClick={onEditMethod}>
            <span className="text-sm font-medium text-[#111827]">
              {draft.paymentMethod || 'Not selected'}
            </span>
          </SummaryRow>

          <SummaryRow label="Supplier" onClick={onEditSupplier}>
            <span
              className={
                draft.supplier
                  ? 'text-sm font-medium text-[#111827]'
                  : 'text-sm font-medium text-[#111827] underline'
              }
            >
              {draft.supplier?.name || 'Add supplier'}
            </span>
          </SummaryRow>

          {balanceOwed > 0 && (
            <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between transition-opacity hover:opacity-85"
                >
                  <span className="text-sm font-medium text-[#00000080]">
                    Balance due by
                  </span>
                  <span className="pointer-events-none flex items-center gap-1">
                    <span
                      className={
                        dueDate
                          ? 'text-sm font-medium text-[#111827]'
                          : 'text-sm font-medium text-[#111827] underline'
                      }
                    >
                      {dueDate
                        ? format(dateFromInput(dueDate) as Date, 'do MMMM, yyyy')
                        : 'Set a due date'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#00000080]" />
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end" side="top">
                <Calendar
                  mode="single"
                  selected={dateFromInput(dueDate)}
                  disabled={{ before: today }}
                  onSelect={(date) => {
                    if (!date) return
                    setDueDate(format(date, 'yyyy-MM-dd'))
                    setDueDateOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isSubmitting || !draft.paymentMethod}
        className="mx-4 mt-2 mb-[max(1rem,env(safe-area-inset-bottom))] flex h-12 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold tracking-[0.2px] text-white hover:bg-black/90 active:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/60"
      >
        {isSubmitting ? (
          <Spinner />
        ) : isEditing ? (
          'Save changes'
        ) : (
          `Record NGN ${formatCurrency(paidNow)}`
        )}
      </button>
    </div>
  )
}
