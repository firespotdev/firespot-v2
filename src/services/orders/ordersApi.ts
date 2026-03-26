import { apiClient } from '@/lib/utils/axios';

export interface CreateOrderPayload {
  quantity: number;
  phoneNumber: string;
  state: string;
  deliveryAddress: string;
}

export const OrdersApi = {
  createOrder: async (payload: CreateOrderPayload) => {
    const { data } = await apiClient.post('/orders', payload);
    return data;
  },

  verifyOrderPayment: async (reference: string) => {
    const { data } = await apiClient.get(`/orders/verify/${reference}`);
    return data;
  },
};
