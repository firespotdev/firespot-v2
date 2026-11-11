import { apiClient } from '@/lib/utils/axios'
import type {
  Expense,
  ExpensePaymentMethod,
  ExpensesQuery,
  RecordExpensePayload,
  Supplier,
  SupplierPayload,
} from './interface'

export const ExpensesApi = {
  list: async (query: ExpensesQuery = {}): Promise<Expense[]> => {
    const { data } = await apiClient.get<Expense[]>('/expenses', {
      params: query,
    })
    return data
  },

  get: async (id: string): Promise<Expense> => {
    const { data } = await apiClient.get<Expense>(`/expenses/${id}`)
    return data
  },

  record: async (payload: RecordExpensePayload): Promise<Expense> => {
    const { data } = await apiClient.post<Expense>('/expenses', payload)
    return data
  },

  edit: async (id: string, payload: RecordExpensePayload): Promise<Expense> => {
    const { data } = await apiClient.patch<Expense>(
      `/expenses/${id}/edit`,
      payload,
    )
    return data
  },

  archive: async (id: string): Promise<Expense> => {
    const { data } = await apiClient.patch<Expense>(`/expenses/${id}/archive`)
    return data
  },

  recordRepayment: async (
    id: string,
    payload: { amount: number; paymentMethod: ExpensePaymentMethod },
  ): Promise<Expense> => {
    const { data } = await apiClient.post<Expense>(
      `/expenses/${id}/repayment`,
      payload,
    )
    return data
  },
}

export const SuppliersApi = {
  list: async (search?: string): Promise<Supplier[]> => {
    const { data } = await apiClient.get<Supplier[]>('/suppliers', {
      params: search ? { search } : undefined,
    })
    return data
  },

  create: async (payload: SupplierPayload): Promise<Supplier> => {
    const { data } = await apiClient.post<Supplier>('/suppliers', payload)
    return data
  },

  update: async (id: string, payload: SupplierPayload): Promise<Supplier> => {
    const { data } = await apiClient.patch<Supplier>(
      `/suppliers/${id}`,
      payload,
    )
    return data
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`)
  },
}
