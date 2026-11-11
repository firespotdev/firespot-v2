'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { SHOP_SETUP_KEY } from '@/services/shop/shopApi'
import { ExpensesApi, SuppliersApi } from './expensesApi'
import type {
  Expense,
  ExpensePaymentMethod,
  ExpensesQuery,
  RecordExpensePayload,
  SupplierPayload,
} from './interface'

const EXPENSES_KEY = ['expenses']
const SUPPLIERS_KEY = ['suppliers']

const expenseKey = (id: string) => ['expense', id]

/** Refresh lists and put the saved expense straight into its detail cache. */
const onExpenseSaved = (queryClient: QueryClient, expense: Expense) => {
  queryClient.setQueryData(expenseKey(expense._id), expense)
  queryClient.invalidateQueries({ queryKey: EXPENSES_KEY })
}

export const useExpenses = (query: ExpensesQuery = {}, enabled = true) =>
  useQuery({
    queryKey: [...EXPENSES_KEY, query],
    queryFn: () => ExpensesApi.list(query),
    enabled,
  })

export const useExpense = (id?: string) =>
  useQuery({
    queryKey: expenseKey(id ?? ''),
    queryFn: () => ExpensesApi.get(id as string),
    enabled: Boolean(id),
  })

export const useRecordExpense = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RecordExpensePayload) => ExpensesApi.record(payload),
    onSuccess: (expense) => onExpenseSaved(queryClient, expense),
  })
}

export const useEditExpense = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecordExpensePayload }) =>
      ExpensesApi.edit(id, payload),
    onSuccess: (expense) => onExpenseSaved(queryClient, expense),
  })
}

export const useArchiveExpense = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ExpensesApi.archive(id),
    onSuccess: (expense) => onExpenseSaved(queryClient, expense),
  })
}

export const useRecordExpenseRepayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      amount,
      paymentMethod,
    }: {
      id: string
      amount: number
      paymentMethod: ExpensePaymentMethod
    }) => ExpensesApi.recordRepayment(id, { amount, paymentMethod }),
    onSuccess: (expense) => onExpenseSaved(queryClient, expense),
  })
}

export const useSuppliers = () =>
  useQuery({
    queryKey: SUPPLIERS_KEY,
    queryFn: () => SuppliersApi.list(),
  })

const onSuppliersChanged = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY })
  // Saving the first supplier completes the "Add supplier contacts" step.
  queryClient.invalidateQueries({ queryKey: SHOP_SETUP_KEY })
}

export const useCreateSupplier = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SupplierPayload) => SuppliersApi.create(payload),
    onSuccess: () => onSuppliersChanged(queryClient),
  })
}

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SupplierPayload }) =>
      SuppliersApi.update(id, payload),
    onSuccess: () => onSuppliersChanged(queryClient),
  })
}

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => SuppliersApi.remove(id),
    onSuccess: () => onSuppliersChanged(queryClient),
  })
}
