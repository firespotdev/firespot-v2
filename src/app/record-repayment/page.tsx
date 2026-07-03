'use client'

import { useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { useSale, useRecordRepayment, useCustomerOutstandingSales } from '@/services/sales/hooks'
import { useDrawerStore } from '@/services/drawer'
import { formatCurrency } from '@/lib/utils'
import { Button, showNotificationToast, CircularIconButton, TabSwitch } from '@/components/ui'
import { Keypad } from '@/components/sales/Keypad'

function RecordRepaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const saleId = searchParams.get('id') || ''
  const queryCustomerId = searchParams.get('customerId') || ''

  const { data: sale, isLoading: isLoadingSale } = useSale(saleId)
  
  const resolvedCustomerId = useMemo(() => {
    if (queryCustomerId) return queryCustomerId
    if (typeof sale?.customerId === 'object' && sale?.customerId?._id) {
      return sale.customerId._id
    }
    if (typeof sale?.customerId === 'string') {
      return sale.customerId
    }
    return ''
  }, [queryCustomerId, sale])

  const {
    data: customerOutstandingSales = [],
    isLoading: isLoadingCustomerSales,
    isFetching: isFetchingCustomerSales,
  } = useCustomerOutstandingSales(resolvedCustomerId)
  
  const recordRepaymentMutation = useRecordRepayment()
  const { openDrawer, closeAllDrawers } = useDrawerStore()

  const [mode, setMode] = useState<'full' | 'part'>('full')
  const [typedAmount, setTypedAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash')

  const isLoadingDebt = useMemo(() => {
    if (saleId && isLoadingSale) return true
    if (saleId && !sale) return true
    if (resolvedCustomerId && (isLoadingCustomerSales || isFetchingCustomerSales)) return true
    return false
  }, [saleId, isLoadingSale, sale, resolvedCustomerId, isLoadingCustomerSales, isFetchingCustomerSales])

  const totalCustomerDebt = useMemo(() => {
    if (customerOutstandingSales.length > 0) {
      return customerOutstandingSales.reduce((sum: number, s: any) => {
        const bal = s?.balanceOwed ?? (s?.amount ? Math.max(0, s.amount - (s.amountPaid || 0)) : 0)
        return sum + bal
      }, 0)
    }
    if (!sale) return 0
    if (sale.balanceOwed !== undefined && sale.balanceOwed !== null) {
      return sale.balanceOwed
    }
    const paid = sale.amountPaid || 0
    return sale.amount ? Math.max(0, sale.amount - paid) : 0
  }, [customerOutstandingSales, sale])

  const balanceOwed = totalCustomerDebt

  // Current active amount to record
  const effectiveAmount = useMemo(() => {
    if (mode === 'full') return balanceOwed
    const parsed = parseFloat(typedAmount)
    return isNaN(parsed) ? 0 : parsed
  }, [mode, balanceOwed, typedAmount])

  const customerName = useMemo(() => {
    if (!sale && customerOutstandingSales.length === 0) return 'Customer'
    const firstSale = sale || customerOutstandingSales[0]
    if (typeof firstSale?.customerId === 'object' && firstSale?.customerId?.name) {
      return firstSale.customerId.name
    }
    if (typeof firstSale?.customerId === 'object' && firstSale?.customerId?.businessName) {
      return firstSale.customerId.businessName
    }
    if (firstSale?.customerName) {
      return firstSale.customerName
    }
    if (firstSale?.description && firstSale.description.startsWith('Sale for ')) {
      return firstSale.description.replace('Sale for ', '').trim()
    }
    return 'Customer'
  }, [sale, customerOutstandingSales])

  const handleKeyPress = (val: string) => {
    if (mode === 'full') {
      setMode('part')
      if (val === '.') setTypedAmount('0.')
      else if (val !== 'backspace') setTypedAmount(val)
      return
    }

    if (val === 'backspace') {
      setTypedAmount((prev) => prev.slice(0, -1))
      return
    }

    if (val === '.') {
      if (typedAmount.includes('.')) return
      setTypedAmount((prev) => (prev === '' ? '0.' : prev + '.'))
      return
    }

    if (typedAmount.includes('.')) {
      const parts = typedAmount.split('.')
      if (parts[1].length >= 2) return
    }

    setTypedAmount((prev) => prev + val)
  }

  const handleToggleMode = (newMode: 'full' | 'part') => {
    setMode(newMode)
    if (newMode === 'full') {
      setTypedAmount('')
    }
  }

  const handleOpenPaymentMethodDrawer = () => {
    openDrawer({
      type: 'payment-method',
      props: {
        currentMethod: paymentMethod,
        onSelectMethod: (method: string) => {
          setPaymentMethod(method)
        },
      },
    })
  }

  const handleOpenSummaryDrawer = () => {
    if ((!saleId && !resolvedCustomerId) || effectiveAmount <= 0) return

    openDrawer({
      type: 'repayment-summary',
      props: {
        sale,
        outstandingSales: customerOutstandingSales.length > 0 ? customerOutstandingSales : (sale ? [sale] : []),
        effectiveAmount,
        customerName,
        paymentMethod,
        setPaymentMethod,
        onConfirmRecord: handleConfirmRepayment,
        isLoading: recordRepaymentMutation.isPending,
      },
    })
  }

  const handleConfirmRepayment = async (amountToRecord: number, methodToUse: string) => {
    if ((!saleId && !resolvedCustomerId) || amountToRecord <= 0) return

    try {
      const result = await recordRepaymentMutation.mutateAsync({
        saleId: saleId || 'customer-repayment',
        payload: {
          amountPaid: amountToRecord,
          paymentMethod: methodToUse,
          customerId: resolvedCustomerId || undefined,
        },
      })
      
      closeAllDrawers()

      const remainingDebt = result?.waterfall?.totalRemainingBalance ?? Math.max(0, balanceOwed - amountToRecord)
      const isFull = remainingDebt <= 0

      openDrawer({
        type: 'repayment-success',
        props: {
          sale: result || sale,
          effectiveAmount: amountToRecord,
          customerName,
          isFullRepayment: isFull,
          remainingBalance: remainingDebt,
          onDismiss: () => router.back(),
        },
      })
    } catch (error: any) {
      showNotificationToast({
        message: error?.response?.data?.message || 'Failed to record repayment',
      })
    }
  }

  if (isLoadingDebt) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <p className="text-gray-500 font-medium">Loading details...</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-white flex flex-col font-satoshi justify-between max-w-md mx-auto relative">
      {/* Top Header */}
      <div>
        <header className="px-4 py-3 flex justify-between items-center relative w-full border-b border-gray-100">
          <CircularIconButton
            icon="arrow-left"
            size="md"
            onClick={() => router.back()}
          />

          {/* Segmented FULL / PART TabSwitch Toggle */}
          <TabSwitch
            value={mode}
            onChange={handleToggleMode}
            options={[
              { label: 'FULL', value: 'full' },
              { label: 'PART', value: 'part' },
            ]}
            maxW="max-w-[144px]"
          />

          <CircularIconButton
            icon="x"
            size="md"
            onClick={() => router.back()}
          />
        </header>

        {/* Amount Owed & Large Keypad Display */}
        <div className="flex flex-col items-center pt-8 pb-4 px-4">
          {isLoadingDebt ? (
            <>
              <div className="h-4 w-48 bg-gray-200 animate-pulse rounded mb-3" />
              <div className="h-10 w-56 bg-gray-200 animate-pulse rounded-lg" />
            </>
          ) : (
            <>
              <p className="text-[#898A8D] text-sm font-medium mb-2 text-center">
                {customerName} owes NGN {formatCurrency(balanceOwed)}
              </p>
              <div className="flex items-center justify-center font-bold text-[42px] tracking-tight text-black">
                <span>₦ {formatCurrency(effectiveAmount)}</span>
                <span className="w-0.5 h-10 bg-[#0085FF] ml-1 animate-pulse" />
              </div>
            </>
          )}
        </div>

        {/* Payment Method Bar */}
        <div className="px-4 py-3 mx-4 my-2 border border-[#F1F1F1] rounded-2xl bg-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0085FF] flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase leading-none mb-1">
                Payment method
              </p>
              <p className="text-sm font-bold text-black leading-none">
                {paymentMethod}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenPaymentMethodDrawer}
            className="px-3.5 py-1.5 bg-[#F4F6F8] hover:bg-gray-200 active:bg-gray-300 text-xs font-bold text-black rounded-full transition-colors uppercase cursor-pointer"
          >
            CHANGE
          </button>
        </div>
      </div>

      {/* Keypad Grid & Bottom CTA */}
      <div className="pb-6">
        {/* Reusable Keypad Component */}
        <Keypad onKeyPress={handleKeyPress} className="mb-6" />

        {/* Record Repayment Button */}
        <div className="px-4">
          <Button
            type="button"
            onClick={handleOpenSummaryDrawer}
            disabled={isLoadingDebt || effectiveAmount <= 0 || recordRepaymentMutation.isPending}
            className="w-full h-14 bg-black hover:bg-black/90 text-white rounded-full font-bold text-base shadow-lg transition-all cursor-pointer"
          >
            {recordRepaymentMutation.isPending
              ? 'Recording...'
              : `Record NGN ${formatCurrency(effectiveAmount)}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function RecordRepaymentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <RecordRepaymentContent />
    </Suspense>
  )
}
