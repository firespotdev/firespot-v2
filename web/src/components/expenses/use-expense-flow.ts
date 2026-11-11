'use client'

import { isAxiosError } from 'axios'
import { showNotificationToast } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import {
  useEditExpense,
  useRecordExpense,
  type Expense,
  type ExpensePaymentMethod,
  type RecordExpensePayload,
  type Supplier,
} from '@/services/expenses'

export const EXPENSE_METHOD_NOTE =
  'Expenses are recorded for accounting purposes only.'
export const EXPENSE_FULL_PAYMENT_NOTE =
  'You paid everything. Click “Paid in part” or “Edit” only if you still owe a balance.'

export interface ExpenseDraft {
  amount: number
  description: string
  paymentMethod?: ExpensePaymentMethod
  installment: 'full' | 'part'
  amountPaid: number
  supplier?: Pick<Supplier, '_id' | 'name'> | null
  dueDate?: string
  /** Repayments already made; editing keeps them, so they count as paid. */
  repaid?: number
}

/** What the first payment can cover once earlier repayments are counted. */
export const firstPaymentLimit = (draft: ExpenseDraft) =>
  Math.max(0, draft.amount - (draft.repaid ?? 0))

type Next = (draft: ExpenseDraft) => void

/** A saved expense as a draft, so editing starts from what was recorded. */
export function draftFromExpense(expense: Expense): ExpenseDraft {
  const repaid = expense.repayments.reduce((sum, r) => sum + r.amount, 0)
  const firstPayment = expense.amountPaid - repaid
  return {
    amount: expense.amount,
    description: expense.description,
    paymentMethod: expense.paymentMethod,
    installment: expense.amountPaid >= expense.amount ? 'full' : 'part',
    amountPaid: firstPayment,
    repaid,
    supplier: expense.supplierId
      ? { _id: expense.supplierId, name: expense.supplierName ?? '' }
      : null,
    dueDate: expense.dueDate?.slice(0, 10),
  }
}

const toPayload = (draft: ExpenseDraft): RecordExpensePayload => ({
  amount: draft.amount,
  description: draft.description.trim(),
  paymentMethod: draft.paymentMethod as ExpensePaymentMethod,
  ...(draft.installment === 'part'
    ? { amountPaid: draft.amountPaid, dueDate: draft.dueDate || undefined }
    : {}),
  supplierId: draft.supplier?._id,
})

const errorMessage = (error: unknown) =>
  (isAxiosError(error) &&
    (error.response?.data as { message?: string | string[] } | undefined)
      ?.message?.toString()) ||
  'Could not save this expense. Please try again.'

/**
 * Owns the drawer chain after the "New expense" keypad:
 * payment-method -> split-payment -> supplier-select -> expense-checkout ->
 * expense-receipt. Each step hands the draft forward as an argument, because
 * drawers are opened from callbacks that would otherwise read stale state.
 */
export function useExpenseFlow(editing?: Expense) {
  const { openDrawer, closeDrawersAbove, closeAllDrawers } = useDrawerStore()
  const recordExpense = useRecordExpense()
  const editExpense = useEditExpense()

  const step = (open: () => void) => {
    closeDrawersAbove('new-expense')
    open()
  }

  const pickMethod = (draft: ExpenseDraft, next: Next) =>
    step(() =>
      openDrawer({
        type: 'payment-method',
        props: {
          title: 'How did you pay?',
          note: EXPENSE_METHOD_NOTE,
          currentMethod: draft.paymentMethod,
          onSubmit: (method: string) =>
            next({ ...draft, paymentMethod: method as ExpensePaymentMethod }),
        },
      }),
    )

  const pickInstallment = (draft: ExpenseDraft, next: Next, back?: () => void) =>
    step(() =>
      openDrawer({
        type: 'split-payment',
        props: {
          totalAmount: firstPaymentLimit(draft),
          initialInstallmentType: draft.installment,
          initialAmountPaid: draft.amountPaid,
          fullPaymentNote: EXPENSE_FULL_PAYMENT_NOTE,
          onBack: back,
          onContinue: (installment: 'full' | 'part', amountPaid: number) =>
            next({
              ...draft,
              installment,
              amountPaid,
              dueDate: installment === 'part' ? draft.dueDate : undefined,
            }),
        },
      }),
    )

  const pickSupplier = (draft: ExpenseDraft, next: Next, back?: () => void) =>
    step(() =>
      openDrawer({
        type: 'supplier-select',
        props: {
          onBack: back,
          onSelect: (supplier: Supplier | null) => next({ ...draft, supplier }),
        },
      }),
    )

  const submit = async (draft: ExpenseDraft) => {
    try {
      const expense = editing
        ? await editExpense.mutateAsync({
            id: editing._id,
            payload: toPayload(draft),
          })
        : await recordExpense.mutateAsync(toPayload(draft))
      closeAllDrawers()
      openDrawer({
        type: 'expense-receipt',
        props: { expenseId: expense._id, justRecorded: true },
      })
    } catch (error) {
      showNotificationToast({ message: errorMessage(error), mode: 'error' })
    }
  }

  const showCheckout = (draft: ExpenseDraft) =>
    step(() =>
      openDrawer({
        type: 'expense-checkout',
        props: {
          draft,
          isEditing: Boolean(editing),
          onEditMethod: () => pickMethod(draft, showCheckout),
          onEditInstallment: () =>
            pickInstallment(draft, showCheckout, () => showCheckout(draft)),
          onEditSupplier: () =>
            pickSupplier(draft, showCheckout, () => showCheckout(draft)),
          onConfirm: submit,
        },
      }),
    )

  /** Called from the keypad once there is an amount and a description. */
  const start = (amount: number, description: string) => {
    if (editing) {
      showCheckout({ ...draftFromExpense(editing), amount, description })
      return
    }
    // First time through: method, then paid in full or part, then supplier.
    // Each step's back arrow returns to the one before it.
    const toMethod = (draft: ExpenseDraft) => pickMethod(draft, toInstallment)
    const toInstallment = (draft: ExpenseDraft) =>
      pickInstallment(draft, toSupplier, () => toMethod(draft))
    const toSupplier = (draft: ExpenseDraft) =>
      pickSupplier(draft, showCheckout, () => toInstallment(draft))

    toMethod({ amount, description, installment: 'full', amountPaid: amount })
  }

  return { start }
}
