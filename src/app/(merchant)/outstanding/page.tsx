'use client'

import { useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { 
  useOutstandingSummary, 
  useSales, 
  useSale 
} from '@/services/sales/hooks'
import { 
  Button, 
  LoaderCircle 
} from '@/components/ui'
import { OutstandingDashboard } from '@/components/outstanding/outstanding-dashboard'
import { CustomerDebtList } from '@/components/outstanding/customer-debt-list'
import { DebtDetailsTimeline } from '@/components/outstanding/debt-details-timeline'

function OutstandingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const customerId = searchParams.get('customerId') || ''
  const saleId = searchParams.get('saleId') || ''

  // API Queries
  const { 
    data: summaryData, 
    isLoading: isLoadingSummary,
    refetch: refetchSummary 
  } = useOutstandingSummary()

  // Fetch sales for the selected customer if customerId is present
  const { 
    data: customerSalesData, 
    isLoading: isLoadingCustomerSales,
    refetch: refetchCustomerSales
  } = useSales(
    customerId ? { customerId, limit: 100 } : { limit: 0 }
  )

  // Fetch specific sale details if saleId is present
  const { 
    data: activeSale, 
    isLoading: isLoadingSale 
  } = useSale(saleId)

  // Sub-view 1: Outstanding Dashboard helpers
  const totalOutstanding = summaryData?.totalOutstandingAmount ?? 0
  const owingCustomers = summaryData?.customers ?? []

  // Sub-view 2: Customer Outstanding List helpers
  const customerSales = customerSalesData?.data ?? []
  
  // Calculate active outstanding balance for this customer
  const customerTotalOwed = useMemo(() => {
    return customerSales.reduce((sum: number, s: any) => {
      const bal = s?.balanceOwed ?? (s?.amount ? Math.max(0, s.amount - (s.amountPaid || 0)) : 0)
      if (s.status === 'OUTSTANDING' || bal > 0) {
        return sum + bal
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

  const unpaidSales = useMemo(() => {
    return customerSales.filter((s: any) => {
      const bal =
        s?.balanceOwed ??
        (s?.amount ? Math.max(0, s.amount - (s.amountPaid || 0)) : 0)
      return s.status === 'OUTSTANDING' || bal > 0
    })
  }, [customerSales])

  const repaidSales = useMemo(() => {
    return customerSales.filter((s: any) => {
      const bal =
        s?.balanceOwed ??
        (s?.amount ? Math.max(0, s.amount - (s.amountPaid || 0)) : 0)

      const hasRepaymentsLater = s.repayments && s.repayments.some((r: any) => {
        const saleTime = new Date(s.recordedAt || s.createdAt).getTime()
        const repTime = new Date(r.recordedAt).getTime()
        return repTime - saleTime > 5000
      })

      const isPaidInFullAtOnce = s.amountPaid === s.amount && !hasRepaymentsLater

      return s.status === 'CONFIRMED' && bal <= 0 && !isPaidInFullAtOnce
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
          customerTotalOwed={customerTotalOwed}
          unpaidSales={unpaidSales}
          repaidSales={repaidSales}
          refetch={() => {
            refetchCustomerSales()
            refetchSummary()
          }}
          onSelectSale={(id) => router.push(`/outstanding?customerId=${customerId}&saleId=${id}`)}
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
