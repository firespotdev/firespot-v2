'use client'

import { useMemo } from 'react'
import { useCustomerOutstandingSales, useSale } from '@/services/sales/hooks'
import type { Sale } from '@/services/sales/interface'
import { getOutstandingBalance } from './use-outstanding-data'

function relationshipId(sale: Sale | undefined) {
  if (typeof sale?.customerId === 'object' && sale.customerId?._id) {
    return String(sale.customerId._id)
  }
  return typeof sale?.customerId === 'string' ? sale.customerId : ''
}

function nameFromSale(sale: Sale | undefined) {
  if (typeof sale?.customerId === 'object') {
    const name = sale.customerId?.name || sale.customerId?.businessName
    if (name) return name
  }
  if (sale?.customerName) return sale.customerName
  if (sale?.description?.startsWith('Sale for ')) {
    return sale.description.replace('Sale for ', '').trim()
  }
  return 'Customer'
}

/**
 * What a repayment is recorded against: every outstanding sale of the
 * customer when one is known, otherwise the single sale.
 */
export function useRepaymentDebt(saleId: string, customerId: string) {
  const { data: sale, isLoading: isLoadingSale } = useSale(saleId)
  const resolvedCustomerId = customerId || relationshipId(sale)
  const {
    data: customerSales = [],
    isLoading: isLoadingCustomerSales,
    isFetching: isFetchingCustomerSales,
  } = useCustomerOutstandingSales(resolvedCustomerId)

  return useMemo(() => {
    const outstandingSales: Sale[] =
      customerSales.length > 0 ? customerSales : sale ? [sale] : []

    return {
      sale,
      customerId: resolvedCustomerId,
      outstandingSales,
      balanceOwed: outstandingSales.reduce(
        (sum, item) => sum + getOutstandingBalance(item),
        0,
      ),
      customerName: nameFromSale(sale || customerSales[0]),
      isLoading:
        (Boolean(saleId) && (isLoadingSale || !sale)) ||
        (Boolean(resolvedCustomerId) &&
          (isLoadingCustomerSales || isFetchingCustomerSales)),
    }
  }, [
    sale,
    saleId,
    resolvedCustomerId,
    customerSales,
    isLoadingSale,
    isLoadingCustomerSales,
    isFetchingCustomerSales,
  ])
}
