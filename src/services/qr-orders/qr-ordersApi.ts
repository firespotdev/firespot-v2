import { apiClient } from '@/lib/utils/axios';

export interface CreateQROrderPayload {
  quantity: number;
  phoneNumber: string;
  state: string;
  deliveryAddress: string;
}

export const QROrdersApi = {
  createOrder: async (payload: CreateQROrderPayload) => {
    const { data } = await apiClient.post('/qr-orders', payload);
    return data;
  },

  verifyOrderPayment: async (reference: string) => {
    const { data } = await apiClient.get(`/qr-orders/verify/${reference}`);
    return data;
  },
};
