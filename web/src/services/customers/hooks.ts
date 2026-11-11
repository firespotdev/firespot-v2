import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CustomersApi,
  type CreateCustomerPayload,
  type CustomerDetails,
} from './customersApi';

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => CustomersApi.getCustomers(),
  });
};

/**
 * Keyed under 'sales' so recording, repaying or archiving a sale anywhere
 * (each invalidates ['sales']) refreshes the customer's page too.
 */
const customerDetailsKey = (id?: string) => ['sales', 'customer', id]

export const useCustomerDetails = (id?: string) => {
  return useQuery({
    queryKey: customerDetailsKey(id),
    queryFn: () => CustomersApi.getCustomerDetails(id!),
    enabled: !!id,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => CustomersApi.createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

/** Saves or unsaves a customer, updating their page straight away. */
export const useSetCustomerFavorite = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isFavorite: boolean) => CustomersApi.setFavorite(id, isFavorite),
    onSuccess: (customer) => {
      queryClient.setQueryData<CustomerDetails>(customerDetailsKey(id), (details) =>
        details ? { ...details, customer: { ...details.customer, ...customer } } : details,
      );
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};
