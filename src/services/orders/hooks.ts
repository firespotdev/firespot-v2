import { useMutation, useQuery } from '@tanstack/react-query';
import { OrdersApi, CreateOrderPayload } from './ordersApi';

export const useCreateOrder = () => {
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => OrdersApi.createOrder(payload),
  });
};

export const useVerifyOrderPayment = (reference: string, options?: any) => {
  return useQuery({
    queryKey: ['order-payment', reference],
    queryFn: () => OrdersApi.verifyOrderPayment(reference),
    enabled: !!reference,
    ...options,
  });
};
