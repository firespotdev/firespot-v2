'use client'

import { useMemo } from 'react'
import { useOutstandingSummary, useSale, useSales } from '@/services/sales/hooks'
import type { SalesApi } from '@/services/sales/salesApi'
import type { Sale } from '@/services/sales/interface'

export type OwingCustomer = Awaited<
  ReturnType<typeof SalesApi.getOutstandingSummary>
>['customers'][number]

// Sales recorded with a repayment within this window were paid upfront.
const UPFRONT_PAYMENT_WINDOW_MS = 5000

export function getOutstandingBalance(sale: Sale) {
  return (
    sale.balanceOwed ??
    (sale.amount ? Math.max(0, sale.amount - (sale.amountPaid || 0)) : 0)
  )
}

const isUnpaid = (sale: Sale) =>
  sale.status === 'OUTSTANDING' && getOutstandingBalance(sale) > 0

function isRepaid(sale: Sale) {
  const saleTime = new Date(sale.recordedAt || sale.createdAt).getTime()
  const hasRepaymentsLater = Boolean(
    sale.repayments?.some(
      (repayment) =>
        new Date(repayment.recordedAt || 0).getTime() - saleTime >
        UPFRONT_PAYMENT_WINDOW_MS,
    ),
  )
  const isPaidInFullAtOnce =
    sale.amountPaid === sale.amount && !hasRepaymentsLater

  return (
    hasRepaymentsLater ||
    (sale.status === 'CONFIRMED' &&
      getOutstandingBalance(sale) <= 0 &&
      !isPaidInFullAtOnce)
  )
}

function contactFromSale(sale: Sale | undefined) {
  if (!sale) return undefined
  if (sale.customerId && typeof sale.customerId === 'object') {
    return {
      name: sale.customerId.name,
      phone: sale.customerId.phoneNumber,
    }
  }
  return { name: sale.customerName, phone: sale.customerPhone }
}

/**
 * The reminder drawer works from a sale; this stands in for a customer's whole
 * outstanding balance, carrying only the fields it reads.
 */
export function customerReminderSale(
  customer: Pick<
    OwingCustomer,
    | 'customerId'
    | 'customerName'
    | 'customerPhone'
    | 'customerAvatar'
    | 'totalOwed'
  >,
): Partial<Sale> {
  return {
    customerId: {
      _id: customer.customerId,
      name: customer.customerName,
      phoneNumber: customer.customerPhone,
      profilePhotoUrl: customer.customerAvatar,
    },
    customerName: customer.customerName,
    customerPhone: customer.customerPhone,
    balanceOwed: customer.totalOwed,
    status: 'OUTSTANDING',
  }
}

/** Owing customers and the merchant's total outstanding balance. */
export function useOutstandingCustomers() {
  const { data, isLoading } = useOutstandingSummary()
  return {
    isLoading,
    totalOutstanding: data?.totalOutstandingAmount ?? 0,
    customers: data?.customers ?? [],
  }
}

/** One customer's unpaid and repaid sales, with their contact details. */
export function useOutstandingCustomer(customerId: string) {
  const { customers } = useOutstandingCustomers()
  const { data, isLoading } = useSales(
    { customerId, limit: 100 },
    { enabled: Boolean(customerId) },
  )

  return useMemo(() => {
    const sales = data?.data ?? []
    const summary = customers.find(
      (customer) => customer.customerId === customerId,
    )
    const contact = contactFromSale(sales[0])
    const unpaidSales = sales.filter(isUnpaid)

    return {
      isLoading,
      customerName: contact?.name || summary?.customerName || 'Customer',
      customerPhone: contact?.phone || summary?.customerPhone || '',
      customerAvatar: summary?.customerAvatar,
      customerTotalOwed: unpaidSales.reduce(
        (sum, sale) => sum + getOutstandingBalance(sale),
        0,
      ),
      unpaidSales,
      repaidSales: sales.filter(isRepaid),
    }
  }, [data?.data, customers, customerId, isLoading])
}

/** One sale's balance and repayment history for the debt timeline. */
export function useOutstandingSale(saleId: string) {
  const { data: sale, isLoading } = useSale(saleId)

  return useMemo(() => {
    if (!sale) return { isLoading, sale, owedAmount: 0, repayments: [] }

    const recorded = sale.repayments ?? []
    // Older sales have no repayment log, only the amount paid.
    const repayments =
      recorded.length > 0
        ? recorded
        : sale.amountPaid && sale.amountPaid > 0
          ? [
              {
                amount: sale.amountPaid,
                paymentMethod: sale.paymentMethod || 'Other',
                recordedAt: sale.recordedAt || sale.createdAt,
              },
            ]
          : []

    return {
      isLoading,
      sale,
      owedAmount: getOutstandingBalance(sale),
      repayments,
    }
  }, [sale, isLoading])
}
