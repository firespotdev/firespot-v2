'use client'

import { ArrowUpRight, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'
import { formatDate } from '@/lib/utils/date-time'
import type { Expense } from '@/services/expenses'

const statusOf = (expense: Expense) =>
  expense.isArchived ? 'Archived' : expense.status === 'OWING' ? 'Owing' : 'Paid'

/** One expense in History, marked as money out by its icon. */
export function ExpenseItem({
  expense,
  onClick,
}: {
  expense: Expense
  onClick: (expense: Expense) => void
}) {
  const title = expense.supplierName || expense.description

  return (
    <button
      type="button"
      onClick={() => onClick(expense)}
      className={cn(
        'flex w-full items-center justify-between gap-3 bg-white p-3 text-left transition-colors hover:bg-gray-50',
        expense.isArchived && 'opacity-70',
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFE9EC]"
          aria-hidden
        >
          <ArrowUpRight size={18} strokeWidth={2.5} className="text-[#FF2D55]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold text-[#111827] capitalize">
            {title}
          </span>
          <span className="block text-[11px] font-medium tracking-tight text-[#6B7280]">
            {formatDate(expense.recordedAt)}
          </span>
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        <span className="flex flex-col items-end">
          <span className="mb-0.5 text-[14px] font-bold text-[#111827]">
            ₦{formatCurrency(expense.amount)}
          </span>
          <StatusBadge status={statusOf(expense)} variant="text" />
        </span>
        <ChevronRight className="text-[#D1D5DB]" size={16} />
      </span>
    </button>
  )
}
