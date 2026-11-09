'use client'

import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useRecordRepayment } from '@/services/sales/hooks'
import { useDrawerStore } from '@/services/drawer'
import { formatCurrency } from '@/lib/utils'
import {
  Button,
  showNotificationToast,
  CircularIconButton,
  TabSwitch,
  LoaderCircle,
} from '@/components/ui'
import { Keypad } from '@/components/sales/Keypad'
import { useRepaymentDebt } from '@/components/outstanding'

type RepaymentMode = 'full' | 'part'

interface RecordRepaymentDrawerProps {
  /** The sale the repayment starts from. */
  saleId?: string
  /** The customer whose outstanding sales the repayment is spread across. */
  customerId?: string
  closeDrawer: () => void
}

const MODE_OPTIONS = [
  { label: 'FULL', value: 'full' },
  { label: 'PART', value: 'part' },
] satisfies Array<{ label: string; value: RepaymentMode }>

/** Typed amount after one keypad press; at most two decimal places. */
function nextTypedAmount(current: string, key: string) {
  if (key === 'backspace') return current.slice(0, -1)
  if (key === '.') {
    if (current.includes('.')) return current
    return current === '' ? '0.' : `${current}.`
  }
  const [, decimals] = current.split('.')
  if (decimals !== undefined && decimals.length >= 2) return current
  return current + key
}

function errorMessage(error: unknown) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || 'Failed to record repayment'
  )
}

/** Full-screen keypad for recording a customer's repayment. */
export function RecordRepaymentDrawer({
  saleId = '',
  customerId = '',
  closeDrawer,
}: RecordRepaymentDrawerProps) {
  const debt = useRepaymentDebt(saleId, customerId)
  const recordRepayment = useRecordRepayment()
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const [mode, setMode] = useState<RepaymentMode>('full')
  const [typedAmount, setTypedAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')

  const { balanceOwed, customerName } = debt
  const parsedAmount = parseFloat(typedAmount)
  const effectiveAmount =
    mode === 'full' ? balanceOwed : isNaN(parsedAmount) ? 0 : parsedAmount
  const amountIsValid =
    mode === 'full'
      ? balanceOwed > 0
      : effectiveAmount > 0 && effectiveAmount < balanceOwed
  const hasTarget = Boolean(saleId || debt.customerId)

  const handleKeyPress = (key: string) => {
    if (mode === 'part') {
      setTypedAmount((current) => nextTypedAmount(current, key))
      return
    }
    // Typing on the full amount switches to a part payment.
    setMode('part')
    if (key !== 'backspace') setTypedAmount(nextTypedAmount('', key))
  }

  const handleToggleMode = (nextMode: RepaymentMode) => {
    setMode(nextMode)
    if (nextMode === 'full') setTypedAmount('')
  }

  const openPaymentMethods = () =>
    openDrawer({
      type: 'payment-method',
      props: {
        currentMethod: paymentMethod,
        onSelectMethod: setPaymentMethod,
      },
    })

  const showSuccess = (
    result: Awaited<ReturnType<typeof recordRepayment.mutateAsync>>,
    amount: number,
    method: string,
  ) => {
    const store = useDrawerStore.getState()
    const fromOutstanding = store.configs.some(
      (config) => config.type === 'outstanding',
    )
    if (fromOutstanding) store.closeDrawersAbove('outstanding')
    else store.closeAllDrawers()

    const waterfall = result?.waterfall
    const remainingBalance =
      waterfall?.totalRemainingBalance ?? Math.max(0, balanceOwed - amount)
    const affectedSales = waterfall?.affectedSales ?? []
    const updatedSale =
      affectedSales.find((item) => item?._id === saleId) ||
      affectedSales[0] ||
      result ||
      debt.sale
    const repayments = updatedSale?.repayments ?? []
    const showCustomer = () =>
      openDrawer({
        type: 'outstanding',
        props: { customerId: debt.customerId, openedAt: Date.now() },
      })

    openDrawer({
      type: 'repayment-success',
      props: {
        sale: result || debt.sale,
        reminderSale: updatedSale && {
          ...updatedSale,
          balanceOwed: remainingBalance,
          customerId:
            updatedSale.customerId || debt.outstandingSales[0]?.customerId,
          customerName: updatedSale.customerName || customerName,
        },
        effectiveAmount: amount,
        customerName,
        paymentMethod: method,
        recordedAt:
          repayments[repayments.length - 1]?.recordedAt ||
          new Date().toISOString(),
        isFullRepayment: remainingBalance <= 0,
        remainingBalance,
        onViewCustomer: showCustomer,
        // Back on the customer's debts, refreshed, when recorded from there.
        onDismiss: fromOutstanding ? showCustomer : undefined,
      },
    })
  }

  const handleConfirmRepayment = async (amount: number, method: string) => {
    if (!hasTarget || amount <= 0 || amount > balanceOwed) return

    try {
      const result = await recordRepayment.mutateAsync({
        saleId: saleId || 'customer-repayment',
        payload: {
          amountPaid: amount,
          paymentMethod: method,
          customerId: debt.customerId || undefined,
        },
      })
      showSuccess(result, amount, method)
    } catch (error: unknown) {
      showNotificationToast({ message: errorMessage(error), mode: 'error' })
    }
  }

  const openSummary = () => {
    if (!hasTarget || !amountIsValid) return

    openDrawer({
      type: 'repayment-summary',
      props: {
        sale: debt.sale,
        outstandingSales: debt.outstandingSales,
        effectiveAmount,
        customerName,
        paymentMethod,
        setPaymentMethod,
        onConfirmRecord: handleConfirmRepayment,
        isLoading: recordRepayment.isPending,
      },
    })
  }

  if (debt.isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white">
        <LoaderCircle innerBg="white" />
      </div>
    )
  }

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col justify-between overflow-hidden bg-white font-satoshi">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="relative flex w-full shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <CircularIconButton icon="arrow-left" size="md" onClick={closeDrawer} />
          <TabSwitch
            value={mode}
            onChange={handleToggleMode}
            options={MODE_OPTIONS}
            maxW="max-w-[144px]"
          />
          <CircularIconButton icon="x" size="md" onClick={closeDrawer} />
        </header>

        <div className="my-auto flex flex-1 flex-col items-center justify-center px-4">
          <p className="mb-2 text-center text-sm font-medium text-[#898A8D]">
            {customerName} owes NGN {formatCurrency(balanceOwed)}
          </p>
          <div className="flex items-center justify-center text-[42px] font-bold tracking-tight text-black">
            <span>₦ {formatCurrency(effectiveAmount)}</span>
            <span className="ml-1 h-10 w-0.5 animate-caret-blink bg-[#0085FF]" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-b border-[#F1F1F1] bg-white px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0085FF]">
            <Wallet size={20} />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase leading-none text-gray-400">
              Payment method
            </p>
            <p className="text-sm font-bold leading-none text-black">
              {paymentMethod}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openPaymentMethods}
          className="cursor-pointer rounded-full bg-[#F4F6F8] px-4 py-2 text-[11px] font-bold uppercase text-black transition-colors hover:bg-gray-200 active:bg-gray-300"
        >
          CHANGE
        </button>
      </div>

      <Keypad onKeyPress={handleKeyPress} />

      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          onClick={openSummary}
          disabled={!amountIsValid || recordRepayment.isPending}
          className="cursor-pointer text-base font-bold transition-all"
        >
          {recordRepayment.isPending
            ? 'Recording...'
            : `Record NGN ${formatCurrency(effectiveAmount)}`}
        </Button>
      </div>
    </div>
  )
}
