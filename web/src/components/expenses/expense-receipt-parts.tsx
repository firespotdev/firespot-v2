'use client'

import { format } from 'date-fns'
import { Archive, Check, Copy } from 'lucide-react'
import {
  ClockFillIcon,
  ClockGradientIcon,
  StatusBadge,
  showNotificationToast,
} from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils/date-time'
import type { Expense } from '@/services/expenses'

const OWED_STYLE = {
  background: 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
}

const RECORDED_ON = "EEEE do 'of' MMMM, yyyy 'at' h:mm a"
const DUE_ON = 'do MMMM, yyyy'

/** Owing only while active: an archived expense reads as Archived, like sales. */
export const isExpenseOwing = (expense: Expense) =>
  expense.status === 'OWING' && !expense.isArchived

/** Headline and sentence shown straight after recording or editing. */
export function recordedCopy(expense: Expense) {
  const owing = isExpenseOwing(expense)
  const title = expense.hasBeenEdited
    ? 'Expense updated'
    : owing
      ? 'Partial payment recorded'
      : 'Full payment recorded'
  const recordedOn = format(new Date(expense.recordedAt), RECORDED_ON)
  const due = expense.dueDate
    ? ` balance due by ${format(new Date(expense.dueDate), DUE_ON)}`
    : ''
  // After repayments the paid amount spans several payments and methods.
  const paid =
    expense.repayments.length > 0
      ? `NGN ${formatCurrency(expense.amountPaid)} paid so far, last on ${format(
          new Date(expense.repayments[expense.repayments.length - 1].recordedAt),
          RECORDED_ON,
        )}.`
      : `${expense.paymentMethod} payment of NGN ${formatCurrency(
          owing ? expense.amountPaid : expense.amount,
        )} on ${recordedOn}.`
  const summary = owing
    ? `${paid} NGN ${formatCurrency(expense.balanceOwed)} outstanding${due}.`
    : paid
  return { title, summary }
}

export function ExpenseHero({
  expense,
  justRecorded,
}: {
  expense: Expense
  justRecorded: boolean
}) {
  const owing = isExpenseOwing(expense)
  const { title, summary } = recordedCopy(expense)

  return (
    <>
      {owing ? (
        <div className="-mt-1 mb-2 shrink-0">
          <ClockGradientIcon size={80} strokeWidth={1} />
        </div>
      ) : (
        <div
          className={cn(
            'mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 bg-white',
            expense.isArchived ? 'border-[#D1D5DB]' : 'border-[#24C166]',
          )}
        >
          <Check
            size={32}
            strokeWidth={3}
            className={expense.isArchived ? 'text-[#D1D5DB]' : 'text-[#24C166]'}
          />
        </div>
      )}

      <div className="mb-6 text-center">
        {justRecorded ? (
          <>
            <h3 className="text-[20px] font-bold -tracking-[0.4px] text-black">
              {title}
            </h3>
            <p className="mx-auto mt-1.5 max-w-[360px] text-[14px] leading-[135%] font-medium text-[#898A8D]">
              {summary}
            </p>
          </>
        ) : (
          <>
            <div className="mb-0.5 flex flex-wrap items-center justify-center gap-1.5">
              <h3 className="text-[20px] leading-none font-bold -tracking-[0.4px] text-black">
                NGN {formatCurrency(expense.amount)}
              </h3>
              {expense.isArchived && <StatusBadge status="Archived" />}
            </div>
            <p className="text-[14px] font-medium text-[#898A8D]">
              {owing
                ? 'Expense recorded partially'
                : 'Expense recorded successfully'}
            </p>
          </>
        )}
      </div>
    </>
  )
}

function StatusRow({ expense }: { expense: Expense }) {
  if (isExpenseOwing(expense)) {
    return (
      <span className="flex items-center gap-0.5">
        <ClockFillIcon size={20} />
        <span className="text-[14px] font-medium" style={OWED_STYLE}>
          Owing
        </span>
      </span>
    )
  }
  const archived = Boolean(expense.isArchived)
  return (
    <span className="flex items-center gap-1">
      <span
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded-full',
          archived ? 'bg-[#9CA3AF]' : 'bg-[#24C166]',
        )}
      >
        <Check className="h-2.5 w-2.5 stroke-[3.5px] text-white" />
      </span>
      <span
        className={cn(
          'text-[14px] font-medium',
          archived ? 'text-[#9CA3AF]' : 'text-[#24C166]',
        )}
      >
        {archived ? 'Archived' : 'Paid'}
      </span>
    </span>
  )
}

export function ExpenseDetailCards({ expense }: { expense: Expense }) {
  const owing = isExpenseOwing(expense)

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(expense.reference)
      showNotificationToast({ message: 'Reference copied', mode: 'success' })
    } catch {
      showNotificationToast({
        message: 'Could not copy the reference.',
        mode: 'error',
      })
    }
  }

  return (
    <>
      <div className="w-full space-y-4 rounded-[12px] border border-[#F1F1F1] bg-white p-5">
        <div className="flex items-center justify-between border-b border-[#F1F1F1] pb-4">
          <span className="text-[14px] text-[#00000080]">Status</span>
          <StatusRow expense={expense} />
        </div>
        {owing ? (
          <>
            <DetailRow label="Amount paid">
              NGN {formatCurrency(expense.amountPaid)}
            </DetailRow>
            <DetailRow label="Outstanding">
              <span style={OWED_STYLE}>
                NGN {formatCurrency(expense.balanceOwed)}
              </span>
            </DetailRow>
          </>
        ) : (
          <DetailRow label="Amount">
            <span className="flex items-center gap-1.5">
              NGN {formatCurrency(expense.amount)}
              {expense.isArchived && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#9CA3AF] text-white">
                  <Archive size={10} strokeWidth={2.5} />
                </span>
              )}
            </span>
          </DetailRow>
        )}
        <DetailRow label="Description">
          <span className="capitalize">{expense.description}</span>
        </DetailRow>
      </div>

      <div className="mt-4 w-full space-y-4 rounded-[12px] border border-[#F1F1F1] bg-white p-5">
        <DetailRow label="Supplier">{expense.supplierName || 'None'}</DetailRow>
        <DetailRow label="Date and time">
          {formatDateTime(expense.recordedAt, { ordinalDay: true })}
        </DetailRow>
        <DetailRow label="Payment method">{expense.paymentMethod}</DetailRow>
        {owing && expense.dueDate && (
          <DetailRow label="Balance due by">
            {format(new Date(expense.dueDate), DUE_ON)}
          </DetailRow>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-[#00000080]">Reference</span>
          <div className="flex items-center gap-2">
            <span className="max-w-[150px] truncate text-[14px] font-medium text-black">
              {expense.reference}
            </span>
            <button
              type="button"
              onClick={() => void copyReference()}
              className="rounded p-1 transition-colors hover:bg-gray-100"
              aria-label="Copy reference"
            >
              <Copy size={16} className="text-[#9CA3AF]" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-[14px] text-[#00000080]">{label}</span>
      <span className="truncate text-right text-[14px] font-medium text-black">
        {children}
      </span>
    </div>
  )
}
