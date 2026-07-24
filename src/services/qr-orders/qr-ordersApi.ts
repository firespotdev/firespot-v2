import { apiClient } from '@/lib/utils/axios';
import type {
  CreateQROrderPayload,
  CreateQROrderResponse,
  QRKitPricing,
  VerifyQROrderResponse,
} from './interface';

export type { CreateQROrderPayload };

export const QROrdersApi = {
  createOrder: async (
    payload: CreateQROrderPayload,
  ): Promise<CreateQROrderResponse> => {
    const { data } = await apiClient.post('/qr-orders', payload);
    return data;
  },

  verifyOrderPayment: async (
    reference: string,
  ): Promise<VerifyQROrderResponse> => {
    const { data } = await apiClient.get(`/qr-orders/verify/${reference}`);
    return data;
  },

  getPricing: async (): Promise<QRKitPricing> => {
    const { data } = await apiClient.get('/qr-orders/pricing');
    return data;
  },
};
