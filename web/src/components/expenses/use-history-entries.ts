'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { useExpenses, type Expense, type ExpensesQuery } from '@/services/expenses'
import type { Sale } from '@/services/sales/interface'

export const HISTORY_FLOWS = ['ALL', 'MONEY IN', 'MONEY OUT'] as const
export type HistoryFlow = (typeof HISTORY_FLOWS)[number]

export type HistoryEntry =
  | { kind: 'sale'; id: string; at: string | Date; sale: Sale }
  | { kind: 'expense'; id: string; at: string; expense: Expense }

interface Filters {
  flow: HistoryFlow
  /** Sales-only mode; collected sales have no expense counterpart. */
  mode: 'all' | 'collected' | 'recorded'
  status: string
  method: string
  qrKit: string
  search: string
}

/**
 * Expenses that match History's filters. Filters that only describe sales
 * (collected, unconfirmed, a QR kit) leave expenses out entirely.
 */
export function useHistoryExpenses(filters: Filters) {
  const included =
    filters.flow !== 'MONEY IN' &&
    filters.mode !== 'collected' &&
    filters.qrKit === 'ALL' &&
    filters.status !== 'UNCONFIRMED'

  const query: ExpensesQuery = {
    limit: 100,
    ...(filters.status === 'PAID' || filters.status === 'OWING'
      ? { status: filters.status }
      : {}),
    ...(filters.status === 'ARCHIVED' ? { includeArchived: true } : {}),
    ...(filters.method !== 'ALL'
      ? { paymentMethod: filters.method as ExpensesQuery['paymentMethod'] }
      : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
  }
  const { data, isLoading } = useExpenses(query, included)

  const expenses = useMemo(() => {
    if (!included) return []
    const list = data ?? []
    return filters.status === 'ARCHIVED'
      ? list.filter((expense) => expense.isArchived)
      : list
  }, [data, filters.status, included])

  return { expenses, isLoading: included && isLoading }
}

/** Sales and expenses together, newest first, grouped by month. */
export function groupHistoryEntries(
  sales: Sale[],
  expenses: Expense[],
): Record<string, HistoryEntry[]> {
  const entries: HistoryEntry[] = [
    ...sales.map((sale) => ({
      kind: 'sale' as const,
      id: sale._id,
      at: sale.recordedAt || sale.createdAt,
      sale,
    })),
    ...expenses.map((expense) => ({
      kind: 'expense' as const,
      id: expense._id,
      at: expense.recordedAt,
      expense,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return entries.reduce<Record<string, HistoryEntry[]>>((groups, entry) => {
    const key = format(new Date(entry.at), 'MMMM yyyy')
    return { ...groups, [key]: [...(groups[key] ?? []), entry] }
  }, {})
}
