'use client'

import { useState } from 'react'
import { isAxiosError } from 'axios'
import { X } from 'lucide-react'
import { Button, showNotificationToast, Spinner } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'
import { useDrawerStore } from '@/services/drawer'
import {
  EXPENSE_PAYMENT_METHODS,
  useRecordExpenseRepayment,
  type Expense,
  type ExpensePaymentMethod,
} from '@/services/expenses'

interface Props {
  expense: Expense
}

/** Digits with at most two decimals, shown with thousands separators. */
const formatTyped = (raw: string) => {
  const [int, dec] = raw.split('.')
  const grouped = int ? new Intl.NumberFormat('en-NG').format(Number(int)) : ''
  return dec !== undefined ? `${grouped}.${dec}` : grouped
}

export function ExpenseRepaymentDrawer({ expense }: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const recordRepayment = useRecordExpenseRepayment()
  const [raw, setRaw] = useState('')
  const [method, setMethod] = useState<ExpensePaymentMethod>(
    expense.paymentMethod,
  )

  const amount = Number(raw) || 0
  const isValid = amount > 0 && amount <= expense.balanceOwed

  const handleChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    const [int = '', dec, extra] = cleaned.split('.')
    if (extra !== undefined || (dec && dec.length > 2)) return
    if (Number(cleaned) > expense.balanceOwed) return
    setRaw(dec !== undefined ? `${int}.${dec}` : int)
  }

  const handleSave = () => {
    if (!isValid) return
    recordRepayment.mutate(
      { id: expense._id, amount, paymentMethod: method },
      {
        onSuccess: (saved) => {
          closeDrawer('expense-repayment')
          showNotificationToast({
            message:
              saved.status === 'PAID'
                ? 'Expense fully paid'
                : `Repayment recorded. NGN ${formatCurrency(saved.balanceOwed)} left`,
            mode: 'success',
          })
        },
        onError: (error) => {
          const message =
            isAxiosError(error) &&
            (error.response?.data as { message?: string } | undefined)?.message
          showNotificationToast({
            message: message || 'Could not record this repayment.',
            mode: 'error',
          })
        },
      },
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-125 flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] font-satoshi">
      <div className="flex items-center justify-between">
        <span className="h-9 w-9" aria-hidden />
        <h2 className="text-[16px] font-bold text-black">Record repayment</h2>
        <button
          type="button"
          onClick={() => closeDrawer('expense-repayment')}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <X className="h-5 w-5 text-black" />
        </button>
      </div>

      <div className="rounded-[12px] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
        <label className="block p-3.5">
          <span className="text-[13px] font-medium text-[#6B7280]">
            Paid now
          </span>
          <span className="mt-1 flex items-center">
            <span className="mr-1 font-family-sofia-pro text-[32px] leading-none font-medium -tracking-[2px] text-[#24C166]">
              ₦
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              autoFocus
              value={formatTyped(raw)}
              onChange={(event) =>
                handleChange(event.target.value.replace(/,/g, ''))
              }
              className="w-full border-none bg-transparent p-0 font-family-sofia-pro text-[32px] leading-none font-medium -tracking-[2px] text-[#24C166] focus:outline-none"
            />
          </span>
        </label>
        <div className="flex items-center justify-between border-t border-[#F1F1F1] p-3.5">
          <span className="text-[13px] font-medium text-[#6B7280]">
            Balance owed
          </span>
          <button
            type="button"
            onClick={() => setRaw(String(expense.balanceOwed))}
            className="text-sm font-bold text-black underline underline-offset-4"
          >
            NGN {formatCurrency(expense.balanceOwed)}
          </button>
        </div>
      </div>

      <fieldset className="rounded-[12px] bg-white p-3.5 shadow-[0px_4px_8px_0px_#0000000A]">
        <legend className="sr-only">How did you pay?</legend>
        <span className="text-[13px] font-medium text-[#6B7280]">
          How did you pay?
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXPENSE_PAYMENT_METHODS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={method === option}
              onClick={() => setMethod(option)}
              className={cn(
                'h-9 rounded-full border px-3.5 text-sm font-medium transition-colors',
                method === option
                  ? 'border-black bg-black text-white'
                  : 'border-[#E5E7EB] bg-white text-black',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>

      <Button
        type="button"
        onClick={handleSave}
        disabled={!isValid || recordRepayment.isPending}
      >
        {recordRepayment.isPending ? (
          <Spinner />
        ) : (
          `Record NGN ${formatCurrency(amount)}`
        )}
      </Button>
    </div>
  )
}
