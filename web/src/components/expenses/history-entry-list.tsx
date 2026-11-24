'use client'

import { SaleItem } from '@/components/sales/SaleItem'
import type { Expense } from '@/services/expenses'
import type { Sale } from '@/services/sales/interface'
import { ExpenseItem } from './expense-item'
import type { HistoryEntry } from './use-history-entries'

interface Props {
  groups: Record<string, HistoryEntry[]>
  onSaleClick: (sale: Sale) => void
  onExpenseClick: (expense: Expense) => void
}

/** History's month-grouped list of sales (money in) and expenses (money out). */
export function HistoryEntryList({ groups, onSaleClick, onExpenseClick }: Props) {
  const months = Object.entries(groups)

  if (months.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-medium text-[#9CA3AF]">
          No transactions match your filters.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {months.map(([month, entries]) => (
        <div key={month}>
          <h4 className="mb-2 text-[14px] font-bold text-black">{month}</h4>
          <div className="divide-y divide-[#F1F1F1] overflow-hidden rounded-[12px] border border-[#F4F6F8] bg-white shadow-[0px_4px_12px_0px_#00000008]">
            {entries.map((entry) =>
              entry.kind === 'sale' ? (
                <SaleItem
                  key={entry.id}
                  sale={entry.sale}
                  variant="history"
                  onClick={() => onSaleClick(entry.sale)}
                />
              ) : (
                <ExpenseItem
                  key={entry.id}
                  expense={entry.expense}
                  onClick={onExpenseClick}
                />
              ),
            )}
          </div>
        </div>
      ))}
      <p className="my-6 text-center text-xs font-medium text-[#00000066]">
        You&apos;ve reached the end of the list
      </p>
    </div>
  )
}
