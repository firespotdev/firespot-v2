import { apiClient, publicApiClient } from '@/lib/utils/axios';
import { Sale, SalesStats, SalesResponse } from './interface';

export interface CreatePendingSalePayload {
  merchantId: string;
  customerFingerprint?: string;
  customerType?: 'New' | 'Repeat';
  source?: 'QR scan' | 'Link shared' | 'Manual';
  targetBankName?: string;
  serialNumber?: string;
}

export interface RecordSalePayload {
  amount: number;
  description?: string;
  paymentMethod: string;
  targetBankName?: string;
}

export interface EditSalePayload {
  amount?: number;
  description?: string;
  paymentMethod?: string;
}



export const SalesApi = {
  createPendingSale: async (payload: CreatePendingSalePayload): Promise<Sale> => {
    const { data } = await publicApiClient.post('/sales/pending', payload);
    return data;
  },

  createManualSale: async (payload: RecordSalePayload): Promise<Sale> => {
    const { data } = await apiClient.post('/sales', payload);
    return data;
  },

  getSales: async (params?: Record<string, string | number | boolean | undefined>): Promise<SalesResponse> => {
    const { data } = await apiClient.get('/sales', { params });
    return data;
  },

  getSale: async (id: string): Promise<Sale> => {
    const { data } = await apiClient.get(`/sales/${id}`);
    return data;
  },

  getSalesStats: async (params?: Record<string, string | number | boolean | undefined>): Promise<SalesStats> => {
    const { data } = await apiClient.get('/sales/stats', { params });
    return data;
  },

  recordSale: async (saleId: string, payload: RecordSalePayload): Promise<Sale> => {
    const { data } = await apiClient.patch(`/sales/${saleId}/record`, payload);
    return data;
  },

  cancelSale: async (saleId: string): Promise<Sale> => {
    const { data } = await apiClient.patch(`/sales/${saleId}/cancel`);
    return data;
  },

  editSale: async (saleId: string, payload: EditSalePayload): Promise<Sale> => {
    const { data } = await apiClient.patch(`/sales/${saleId}/edit`, payload);
    return data;
  },
};
