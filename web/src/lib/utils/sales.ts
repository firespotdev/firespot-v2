import { Sale } from '@/services/sales/interface'
import { formatCurrency } from '@/lib/utils'

export type MerchantStatus = 'Paid' | 'Owing' | 'Unconfirmed' | 'Archived'

export const getMerchantStatus = (sale?: Sale | null): MerchantStatus => {
  if (!sale) return 'Unconfirmed'
  if (
    sale.isArchived ||
    sale.status === 'CANCELLED' ||
    sale.status === 'ARCHIVED'
  ) {
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
  if (
    sale.isPaidInFull ||
    sale.status === 'CONFIRMED' ||
    sale.balanceOwed === 0
  ) {
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

type SaleDescriptionSource = Pick<Sale, 'amount' | 'description' | 'items'>

export const getSaleSubject = (sale?: SaleDescriptionSource | null) => {
  const itemCount =
    sale?.items?.reduce(
      (total, item) => total + Math.max(1, Number(item.quantity) || 1),
      0,
    ) || 0
  const description = sale?.description?.trim()
  const firstItem = sale?.items?.[0]?.productName?.trim()
  const isGeneratedItemName = (value?: string) =>
    !!value && /^Item \d+(?: x\d+)?$/i.test(value)

  return itemCount > 1
    ? `${itemCount} items`
    : description && !isGeneratedItemName(description)
      ? description
      : itemCount === 1
        ? firstItem && !isGeneratedItemName(firstItem)
          ? firstItem
          : 'this sale'
        : 'this sale'
}

export const getSaleDescription = (sale?: SaleDescriptionSource | null) => {
  const subject = getSaleSubject(sale)
  const amount = `₦${formatCurrency(sale?.amount || 0)}`
  return `${amount} for ${subject}`
}

export const getSaleDetailDescription = (
  sale?: SaleDescriptionSource | null,
) => {
  const description = sale?.description?.trim()
  const isGeneratedItemName =
    !!description && /^Item \d+(?: x\d+)?$/i.test(description)

  return description && !isGeneratedItemName ? description : 'This sale'
}

export const getStatusDescription = (sale: Sale) => {
  return getSaleDescription(sale)
}

export const getRecentSaleSummary = (sale: Sale) => {
  return getSaleDescription(sale)
}

export const getSaleCustomerName = (sale: Sale) => {
  if (typeof sale.customerId === 'object' && sale.customerId) {
    const relationshipName =
      sale.customerId.name || sale.customerId.businessName
    if (relationshipName?.trim()) return relationshipName.trim()
  }

  if (sale.customerName?.trim()) return sale.customerName.trim()

  return sale.customerType === 'Repeat'
    ? 'Repeat customer'
    : 'New customer'
}
