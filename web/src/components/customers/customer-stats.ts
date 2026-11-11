import { format, formatDistanceToNowStrict } from 'date-fns'
import { getMerchantStatus } from '@/lib/utils/sales'
import type { Sale } from '@/services/sales/interface'

export interface CustomerStats {
  /** Sales that still count: everything except archived ones. */
  purchases: number
  /** Paid sales and what they came to. */
  confirmedSales: number
  spent: number
  outstanding: number
  lastVisitAt?: Date
}

const saleDate = (sale: Sale) => new Date(sale.recordedAt || sale.createdAt)

/**
 * Totals for a customer's page, read from each sale's merchant status so they
 * agree with the rows below them (an archived sale never counts as owing).
 */
export function customerStats(sales: Sale[]): CustomerStats {
  const active = sales.filter((sale) => getMerchantStatus(sale) !== 'Archived')
  const paid = active.filter((sale) => getMerchantStatus(sale) === 'Paid')
  const owing = active.filter((sale) => getMerchantStatus(sale) === 'Owing')
  const lastVisit = active
    .map(saleDate)
    .sort((a, b) => b.getTime() - a.getTime())[0]

  return {
    purchases: active.length,
    confirmedSales: paid.length,
    spent: paid.reduce((sum, sale) => sum + (sale.amount || 0), 0),
    outstanding: owing.reduce((sum, sale) => sum + (sale.balanceOwed || 0), 0),
    lastVisitAt: lastVisit,
  }
}

export const lastVisitedLabel = (lastVisitAt?: Date) =>
  lastVisitAt
    ? `Last visited ${formatDistanceToNowStrict(lastVisitAt, { addSuffix: true })}`
    : 'No visits yet'

/** Items newest first, grouped under "Month YYYY" headings. */
export function groupByMonth<T>(
  items: T[],
  dateOf: (item: T) => string | Date | undefined,
): Array<[string, T[]]> {
  const dated = items
    .map((item) => ({ item, at: dateOf(item) }))
    .filter((entry): entry is { item: T; at: string | Date } => Boolean(entry.at))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return dated.reduce<Array<[string, T[]]>>((groups, { item, at }) => {
    const key = format(new Date(at), 'MMMM yyyy')
    const last = groups[groups.length - 1]
    return last && last[0] === key
      ? [...groups.slice(0, -1), [key, [...last[1], item]]]
      : [...groups, [key, [item]]]
  }, [])
}

export const purchasesLabel = (count: number) =>
  `${count} ${count === 1 ? 'purchase' : 'purchases'}`
