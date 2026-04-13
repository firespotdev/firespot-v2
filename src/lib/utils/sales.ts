import { Sale } from '@/services/sales/interface'
import { formatCurrency } from '@/lib/utils'

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return 'text-[#24C166]'
    case 'PENDING':
      return 'text-[#BB8123]'
    case 'CANCELLED':
      return 'text-[#9CA3AF]'
    default:
      return 'text-[#6B7280]'
  }
}

export const getStatusLabel = (sale: Sale) => {
  if (sale.status === 'CONFIRMED') return 'Confirmed'
  if (sale.status === 'CANCELLED') return 'Cancelled'
  if (sale.source) return `From ${sale.source}`
  return 'Pending'
}

export const getAmountLabel = (sale: Sale) => {
  if (sale.status === 'CANCELLED') return 'No sale'
  if (sale.amount) return `₦${formatCurrency(sale.amount)}`
  return 'Enter amount'
}

export const getStatusDescription = (sale: Sale) => {
  if (sale.status === 'CANCELLED') return 'Cancelled'
  if (sale.status === 'PENDING') return 'New sale'
  return sale.description || 'New sale'
}
