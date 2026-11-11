'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button, LoaderCircle, showNotificationToast } from '@/components/ui'
import { AmountTab } from '@/components/sales/AmountTab'
import {
  formatDisplayAmount,
  nextAmount,
} from '@/components/sales/amount-input'
import { useExpenseFlow } from '@/components/expenses/use-expense-flow'
import { useExpense, type Expense } from '@/services/expenses'

interface Props {
  /** The expense being edited; leave out to record a new one. */
  expenseId?: string
  closeDrawer: () => void
}

export function NewExpenseDrawer({ expenseId, closeDrawer }: Props) {
  const { data: editing, isLoading } = useExpense(expenseId)

  if (expenseId && (isLoading || !editing)) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="h-10 w-10">
          <LoaderCircle innerBg="#FFFFFF" />
        </div>
      </div>
    )
  }

  return (
    <ExpenseKeypad
      key={editing?._id ?? 'new'}
      editing={editing}
      closeDrawer={closeDrawer}
    />
  )
}

function ExpenseKeypad({
  editing,
  closeDrawer,
}: {
  editing?: Expense
  closeDrawer: () => void
}) {
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const flow = useExpenseFlow(editing)

  const value = Number(amount)
  const hasAmount = Number.isFinite(value) && value > 0

  const handleRecord = () => {
    if (!hasAmount) return
    if (!description.trim()) {
      showNotificationToast({
        message: 'Say what this expense was for',
        mode: 'error',
      })
      return
    }
    flow.start(value, description.trim())
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white font-satoshi">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="h-10 w-10 shrink-0" aria-hidden />
        <h2 className="text-[16px] font-bold text-black">
          {editing ? 'Edit expense' : 'New expense'}
        </h2>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close"
          className="-mr-2 shrink-0 cursor-pointer rounded-full p-2 text-black"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <AmountTab
        amount={amount}
        description={description}
        setDescription={setDescription}
        formatDisplayAmount={formatDisplayAmount}
        addCustomAmountToCart={() => {}}
        handleKeyPress={(key) => setAmount((prev) => nextAmount(prev, key))}
        showAddButton={false}
      />

      <div className="absolute bottom-0 left-0 right-0 z-20 flex min-h-20 items-center border-t border-[#F4F6F8] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0px_-2px_10px_rgba(0,0,0,0.03)]">
        <Button
          type="button"
          onClick={handleRecord}
          disabled={!hasAmount}
          className="h-12"
        >
          {editing ? 'Continue' : 'Record'}
        </Button>
      </div>
    </div>
  )
}
