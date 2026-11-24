'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button, LoaderCircle } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import {
  CustomerDebtList,
  DebtDetailsTimeline,
  OutstandingDashboard,
  useOutstandingCustomer,
  useOutstandingCustomers,
  useOutstandingSale,
} from '@/components/outstanding'

type OutstandingView =
  | { kind: 'dashboard' }
  | { kind: 'customer'; customerId: string }
  | { kind: 'sale'; customerId: string; saleId: string }

interface OutstandingDrawerProps {
  /** Opens straight on this customer's debts. */
  customerId?: string
  /** With customerId, opens straight on this sale's debt details. */
  saleId?: string
  /**
   * Changes each time the sheet is opened, so reopening it while it is
   * already in the stack (after a repayment) moves it to the requested view.
   */
  openedAt?: number
  closeDrawer: () => void
}

function initialView(customerId?: string, saleId?: string): OutstandingView {
  if (customerId && saleId) return { kind: 'sale', customerId, saleId }
  if (customerId) return { kind: 'customer', customerId }
  return { kind: 'dashboard' }
}

function FullScreenLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <LoaderCircle innerBg="#F4F6F8" />
    </div>
  )
}

function OutstandingContent({
  customerId,
  saleId,
  openedAt,
  closeDrawer,
}: OutstandingDrawerProps) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const [view, setView] = useState(() => initialView(customerId, saleId))
  const [viewOpenedAt, setViewOpenedAt] = useState(openedAt)
  if (openedAt !== viewOpenedAt) {
    setViewOpenedAt(openedAt)
    setView(initialView(customerId, saleId))
  }

  const activeCustomerId = view.kind === 'dashboard' ? '' : view.customerId
  const activeSaleId = view.kind === 'sale' ? view.saleId : ''
  const owing = useOutstandingCustomers()
  const customer = useOutstandingCustomer(activeCustomerId)
  const debt = useOutstandingSale(activeSaleId)

  const goBack = () => {
    if (view.kind === 'sale') {
      setView({ kind: 'customer', customerId: view.customerId })
    } else if (view.kind === 'customer') {
      setView({ kind: 'dashboard' })
    } else {
      closeDrawer()
    }
  }

  const recordRepayment = (repayment: { saleId?: string }) =>
    openDrawer({
      type: 'record-repayment',
      props: { customerId: activeCustomerId, ...repayment },
    })

  if (view.kind === 'sale') {
    if (debt.isLoading) return <FullScreenLoader />
    if (!debt.sale) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-4">
          <AlertCircle className="mb-3 h-12 w-12 text-[#FB5012]" />
          <p className="mb-4 text-sm font-bold text-black">
            Debt details not found.
          </p>
          <Button onClick={goBack}>Back</Button>
        </div>
      )
    }
    return (
      <DebtDetailsTimeline
        sale={debt.sale}
        saleOwedAmount={debt.owedAmount}
        saleRepayments={debt.repayments}
        onRecordRepayment={() => recordRepayment({ saleId: view.saleId })}
        onBack={goBack}
      />
    )
  }

  if (view.kind === 'customer') {
    if (customer.isLoading) return <FullScreenLoader />
    return (
      <CustomerDebtList
        customerId={view.customerId}
        customerName={customer.customerName}
        customerPhone={customer.customerPhone}
        customerAvatar={customer.customerAvatar}
        customerTotalOwed={customer.customerTotalOwed}
        unpaidSales={customer.unpaidSales}
        repaidSales={customer.repaidSales}
        onSelectSale={(id) =>
          setView({ kind: 'sale', customerId: view.customerId, saleId: id })
        }
        onRecordRepayment={() => recordRepayment({})}
        onArchived={() => setView({ kind: 'dashboard' })}
        onBack={goBack}
      />
    )
  }

  if (owing.isLoading) return <FullScreenLoader />
  return (
    <OutstandingDashboard
      totalOutstanding={owing.totalOutstanding}
      owingCustomers={owing.customers}
      onSelectCustomer={(id) => setView({ kind: 'customer', customerId: id })}
      onClose={closeDrawer}
    />
  )
}

/** Full-screen sheet for following up on money customers owe the merchant. */
export function OutstandingDrawer(props: OutstandingDrawerProps) {
  return (
    <div className="h-dvh w-full overflow-hidden bg-[#F4F6F8] font-satoshi">
      <OutstandingContent {...props} />
    </div>
  )
}
