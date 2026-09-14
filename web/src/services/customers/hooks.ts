import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CustomersApi, CreateCustomerPayload } from './customersApi';

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => CustomersApi.getCustomers(),
  });
};

export const useCustomerDetails = (id?: string) => {
  return useQuery({
    queryKey: ['customer', id],
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
