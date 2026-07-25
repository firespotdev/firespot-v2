import { Sale } from '@/services/sales/interface'
import { formatCurrency } from '@/lib/utils'

export type MerchantStatus = 'Paid' | 'Owing' | 'Unconfirmed' | 'Archived'

export const getMerchantStatus = (sale?: Sale | null): MerchantStatus => {
  if (!sale) return 'Unconfirmed'
  if (sale.isArchived || sale.status === 'CANCELLED' || sale.status === 'ARCHIVED') {
    return 'Archived'
  }
  if (sale.status === 'PENDING') {
    return 'Unconfirmed'
  }
  if (
    (sale.balanceOwed !== undefined && sale.balanceOwed > 0) ||
    sale.status === 'OUTSTANDING'
  ) {
    return 'Owing'
  }
  if (sale.isPaidInFull || sale.status === 'CONFIRMED' || sale.balanceOwed === 0) {
    return 'Paid'
  }
  return 'Unconfirmed'
}

export const getStatusColor = (status: string) => {
  const upper = (status || '').toUpperCase()
  switch (upper) {
    case 'PAID':
    case 'CONFIRMED':
      return 'text-[#24C166]'
    case 'OWING':
    case 'OUTSTANDING':
      return 'text-[#D72483]'
    case 'UNCONFIRMED':
    case 'PENDING':
      return 'text-[#BB8123]'
    case 'ARCHIVED':
    case 'CANCELLED':
      return 'text-[#9CA3AF]'
    default:
      return 'text-[#6B7280]'
  }
}

export const getStatusLabel = (sale: Sale) => {
  return getMerchantStatus(sale)
}

export const getAmountLabel = (sale: Sale) => {
  if (sale.amount !== undefined && sale.amount !== null) {
    return `₦${formatCurrency(sale.amount)}`
  }
  return 'Enter amount'
}

type SaleDescriptionSource = Pick<Sale, 'description' | 'items'>

export const getSaleDescription = (
  sale?: SaleDescriptionSource | null,
  fallback = 'New sale',
) => {
  const firstItem = sale?.items?.[0]?.productName?.trim()

  if (firstItem) {
    const otherItemCount = Math.max(0, (sale?.items?.length || 0) - 1)
    if (otherItemCount > 0) {
      return `${firstItem} + ${otherItemCount} ${
        otherItemCount === 1 ? 'other' : 'others'
      }`
    }
    return firstItem
  }

  return sale?.description?.trim() || fallback
}

export const getStatusDescription = (sale: Sale) => {
  return getSaleDescription(sale)
}
