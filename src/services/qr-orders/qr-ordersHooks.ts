import { useMutation, useQuery } from '@tanstack/react-query';
import { QROrdersApi, CreateQROrderPayload } from './qr-ordersApi';

export const useCreateQROrder = () => {
  return useMutation({
    mutationFn: (payload: CreateQROrderPayload) => QROrdersApi.createOrder(payload),
  });
};

export const useVerifyQROrderPayment = (reference: string, options?: any) => {
  return useQuery({
    queryKey: ['qr-order-payment', reference],
    queryFn: () => QROrdersApi.verifyOrderPayment(reference),
    enabled: !!reference,
    ...options,
  });
};
