export const EXPENSE_PAYMENT_METHODS = [
  'Bank Transfer',
  'Cash',
  'POS',
  'Other',
] as const
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number]
export type ExpenseStatus = 'PAID' | 'OWING'

export interface ExpenseRepayment {
  amount: number
  paymentMethod: ExpensePaymentMethod
  recordedAt: string
}

/** Money the business spent. A record only; Firespot never moves it. */
export interface Expense {
  _id: string
  reference: string
  amount: number
  description: string
  paymentMethod: ExpensePaymentMethod
  amountPaid: number
  balanceOwed: number
  status: ExpenseStatus
  dueDate?: string
  supplierId?: string
  supplierName?: string
  supplierPhone?: string
  repayments: ExpenseRepayment[]
  location?: string
  recordedAt: string
  hasBeenEdited: boolean
  isArchived: boolean
}

export interface RecordExpensePayload {
  amount: number
  description: string
  paymentMethod: ExpensePaymentMethod
  /** Leave out for a full payment. */
  amountPaid?: number
  dueDate?: string
  supplierId?: string
}

export interface ExpensesQuery {
  status?: ExpenseStatus
  paymentMethod?: ExpensePaymentMethod
  supplierId?: string
  search?: string
  includeArchived?: boolean
  limit?: number
}

/** A saved contact the business buys from. Gets no account or messages. */
export interface Supplier {
  _id: string
  name: string
  phoneNumber: string
}

export interface SupplierPayload {
  name: string
  phoneNumber: string
}
