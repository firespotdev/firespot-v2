'use client'

import { useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import {
  useOutstandingSummary,
  useSales,
  useSale,
} from '@/services/sales/hooks'
import { Button, LoaderCircle } from '@/components/ui'
import { OutstandingDashboard } from '@/components/outstanding/outstanding-dashboard'
import { CustomerDebtList } from '@/components/outstanding/customer-debt-list'
import { DebtDetailsTimeline } from '@/components/outstanding/debt-details-timeline'
import type { Sale } from '@/services/sales/interface'

function getOutstandingBalance(sale: Sale) {
  return (
    sale.balanceOwed ??
    (sale.amount ? Math.max(0, sale.amount - (sale.amountPaid || 0)) : 0)
  )
}

function OutstandingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const customerId = searchParams.get('customerId') || ''
  const saleId = searchParams.get('saleId') || ''
  const origin = searchParams.get('origin')

  // API Queries
  const { data: summaryData, isLoading: isLoadingSummary } =
    useOutstandingSummary()

  // Fetch sales for the selected customer if customerId is present
  const { data: customerSalesData, isLoading: isLoadingCustomerSales } =
    useSales(customerId ? { customerId, limit: 100 } : { limit: 0 })

  // Fetch specific sale details if saleId is present
  const { data: activeSale, isLoading: isLoadingSale } = useSale(saleId)

  // Sub-view 1: Outstanding Dashboard helpers
  const totalOutstanding = summaryData?.totalOutstandingAmount ?? 0
  const owingCustomers = useMemo(
    () => summaryData?.customers ?? [],
    [summaryData?.customers],
  )

  // Sub-view 2: Customer Outstanding List helpers
  const customerSales = useMemo(
    () => customerSalesData?.data ?? [],
    [customerSalesData?.data],
  )

  // Calculate active outstanding balance for this customer
  const customerTotalOwed = useMemo(() => {
    return customerSales.reduce((sum, sale) => {
      const balance = getOutstandingBalance(sale)
      if (sale.status === 'OUTSTANDING' && balance > 0) {
        return sum + balance
      }
      return sum
    }, 0)
  }, [customerSales])

  const customerName = useMemo(() => {
    if (customerSales.length > 0) {
      const first = customerSales[0]
      if (first.customerId && typeof first.customerId === 'object') {
        return first.customerId.name || 'Customer'
      }
      return first.customerName || 'Customer'
    }
    const matchingCustomer = owingCustomers.find(
      (c) => c.customerId === customerId,
    )
    return matchingCustomer?.customerName || 'Customer'
  }, [customerSales, owingCustomers, customerId])

  const customerPhone = useMemo(() => {
    if (customerSales.length > 0) {
      const first = customerSales[0]
      if (first.customerId && typeof first.customerId === 'object') {
        return first.customerId.phoneNumber || ''
      }
      return first.customerPhone || ''
    }
    const matchingCustomer = owingCustomers.find(
      (c) => c.customerId === customerId,
    )
    return matchingCustomer?.customerPhone || ''
  }, [customerSales, owingCustomers, customerId])

  const customerAvatar = useMemo(
    () =>
      owingCustomers.find((customer) => customer.customerId === customerId)
        ?.customerAvatar,
    [owingCustomers, customerId],
  )

  const unpaidSales = useMemo(() => {
    return customerSales.filter((sale) => {
      const balance = getOutstandingBalance(sale)
      return sale.status === 'OUTSTANDING' && balance > 0
    })
  }, [customerSales])

  const repaidSales = useMemo(() => {
    return customerSales.filter((sale) => {
      const balance = getOutstandingBalance(sale)

      const hasRepaymentsLater =
        sale.repayments &&
        sale.repayments.some((repayment) => {
          const saleTime = new Date(
            sale.recordedAt || sale.createdAt,
          ).getTime()
          const repTime = new Date(repayment.recordedAt || 0).getTime()
          return repTime - saleTime > 5000
        })

      const isPaidInFullAtOnce =
        sale.amountPaid === sale.amount && !hasRepaymentsLater

      return (
        sale.status === 'CONFIRMED' &&
        balance <= 0 &&
        !isPaidInFullAtOnce
      )
    })
  }, [customerSales])

  // Sub-view 3: Debt Details timeline helper
  const saleRepayments = useMemo(() => {
    if (!activeSale) return []
    if (activeSale.repayments && activeSale.repayments.length > 0) {
      return activeSale.repayments
    }
    // Fallback for older sales missing repayment logs
    if (activeSale.amountPaid && activeSale.amountPaid > 0) {
      return [
        {
          amount: activeSale.amountPaid,
          paymentMethod: activeSale.paymentMethod || 'Other',
          recordedAt: activeSale.recordedAt || activeSale.createdAt,
        },
      ]
    }
    return []
  }, [activeSale])

  const saleOwedAmount = useMemo(() => {
    if (!activeSale) return 0
    return (
      activeSale.balanceOwed ??
      (activeSale.amount
        ? Math.max(0, activeSale.amount - (activeSale.amountPaid || 0))
        : 0)
    )
  }, [activeSale])

  const handleBackClick = () => {
    if (saleId) {
      // Go back to customer debts view
      router.push(`/outstanding?customerId=${customerId}`)
    } else if (customerId) {
      // Go back to owing customers list
      router.push('/outstanding')
    } else {
      // Go back to profile dashboard
      router.push('/profile')
    }
  }

  // View 3: Debt Details Timeline
  if (saleId) {
    if (isLoadingSale) {
      return (
        <div className="h-dvh bg-[#F4F6F8] flex items-center justify-center">
          <LoaderCircle innerBg="#F4F6F8" />
        </div>
      )
    }

    if (!activeSale) {
      return (
        <div className="h-dvh bg-[#F4F6F8] flex flex-col justify-center items-center p-4">
          <AlertCircle className="w-12 h-12 text-[#FB5012] mb-3" />
          <p className="text-sm font-bold text-black mb-4">
            Debt details not found.
          </p>
          <Button onClick={handleBackClick}>Back</Button>
        </div>
      )
    }

    return (
      <div className="h-dvh bg-[#F4F6F8] overflow-hidden">
        <DebtDetailsTimeline
          sale={activeSale}
          saleOwedAmount={saleOwedAmount}
          saleRepayments={saleRepayments}
          recordRepaymentHref={
            origin === 'history' && customerId
              ? `/record-repayment?${new URLSearchParams({
                  id: activeSale._id,
                  customerId,
                  returnTo: `/outstanding?customerId=${customerId}`,
                }).toString()}`
              : undefined
          }
          onBack={handleBackClick}
        />
      </div>
    )
  }

  // View 2: Customer Outstanding List
  if (customerId) {
    if (isLoadingCustomerSales) {
      return (
        <div className="h-dvh bg-[#F4F6F8] flex items-center justify-center">
          <LoaderCircle innerBg="#F4F6F8" />
        </div>
      )
    }

    return (
      <div className="h-dvh bg-[#F4F6F8] overflow-hidden">
        <CustomerDebtList
          customerId={customerId}
          customerName={customerName}
          customerPhone={customerPhone}
          customerAvatar={customerAvatar}
          customerTotalOwed={customerTotalOwed}
          unpaidSales={unpaidSales}
          repaidSales={repaidSales}
          onSelectSale={(id) =>
            router.push(`/outstanding?customerId=${customerId}&saleId=${id}`)
          }
          onArchived={() => router.push('/outstanding')}
          onBack={handleBackClick}
        />
      </div>
    )
  }

  // View 1: Outstanding Dashboard (list of owing customers)
  if (isLoadingSummary) {
    return (
      <div className="h-dvh bg-[#F4F6F8] flex items-center justify-center">
        <LoaderCircle innerBg="#F4F6F8" />
      </div>
    )
  }

  return (
    <div className="h-dvh bg-[#F4F6F8] overflow-hidden">
      <OutstandingDashboard
        totalOutstanding={totalOutstanding}
        owingCustomers={owingCustomers}
        onSelectCustomer={(id) => router.push(`/outstanding?customerId=${id}`)}
        onBack={handleBackClick}
      />
    </div>
  )
}

export default function OutstandingPage() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh bg-[#F4F6F8] flex items-center justify-center">
          <LoaderCircle innerBg="#F4F6F8" />
        </div>
      }
    >
      <OutstandingPageContent />
    </Suspense>
  )
}
