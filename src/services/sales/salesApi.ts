import { apiClient, publicApiClient } from '@/lib/utils/axios';

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

export interface SalesStats {
  pendingSalesCount: number;
  todaySalesCount: number;
  todaySalesAmount: number;
  totalSalesAmount: number;
  trend?: Array<{ label: string; amount: number; count: number }>;
  percentageChange?: number;
  previousPeriodLabel?: string;
}

export const SalesApi = {
  createPendingSale: async (payload: CreatePendingSalePayload) => {
    const { data } = await publicApiClient.post('/sales/pending', payload);
    return data;
  },

  createManualSale: async (payload: RecordSalePayload) => {
    const { data } = await apiClient.post('/sales', payload);
    return data;
  },

  getSales: async (params?: Record<string, any>) => {
    const { data } = await apiClient.get('/sales', { params });
    return data;
  },

  getSalesStats: async (params?: Record<string, any>) => {
    const { data } = await apiClient.get('/sales/stats', { params });
    return data;
  },

  recordSale: async (saleId: string, payload: RecordSalePayload) => {
    const { data } = await apiClient.patch(`/sales/${saleId}/record`, payload);
    return data;
  },

  cancelSale: async (saleId: string) => {
    const { data } = await apiClient.patch(`/sales/${saleId}/cancel`);
    return data;
  },
};
