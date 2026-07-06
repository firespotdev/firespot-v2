import { apiClient, publicApiClient } from '@/lib/utils/axios';
import { Sale, SalesStats, SalesResponse } from './interface';

export interface CreatePendingSalePayload {
  merchantId: string;
  customerFingerprint?: string;
  customerType?: 'New' | 'Repeat';
  source?: 'QR scan' | 'Link shared' | 'Manual';
  targetBankName?: string;
  serialNumber?: string;
  amount?: number;
  description?: string;
  items?: any[];
  isPaidInFull?: boolean;
  amountPaid?: number;
  totalDue?: number;
  balanceOwed?: number;
  customerId?: string;
}

export interface RecordSalePayload {
  amount: number;
  description?: string;
  paymentMethod: string;
  targetBankName?: string;
  isPaidInFull?: boolean;
  amountPaid?: number;
  totalDue?: number;
  balanceOwed?: number;
  customerId?: string;
  items?: any[];
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

  createPendingCollectSale: async (payload: CreatePendingSalePayload): Promise<Sale> => {
    const { data } = await apiClient.post('/sales/collect', payload);
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

  archiveSale: async (saleId: string): Promise<Sale> => {
    const { data } = await apiClient.patch(`/sales/${saleId}/archive`);
    return data;
  },

  recordRepayment: async (saleId: string, payload: { amountPaid: number; paymentMethod?: string; customerId?: string }): Promise<any> => {
    const { data } = await apiClient.post(`/sales/${saleId}/repayment`, payload);
    return data;
  },

  getCustomerOutstandingSales: async (customerId: string): Promise<Sale[]> => {
    const { data } = await apiClient.get(`/sales/customer/${customerId}/outstanding`);
    return data;
  },

  uploadReceipt: async (saleId: string, file: File): Promise<Sale> => {

    const formData = new FormData();
    formData.append('receipt', file);
    const { data } = await publicApiClient.post(`/sales/${saleId}/receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getOutstandingSummary: async (): Promise<{
    totalOutstandingAmount: number;
    customers: Array<{
      customerId: string;
      customerName: string;
      customerPhone: string;
      customerAvatar?: string;
      transactionCount: number;
      totalOwed: number;
    }>;
  }> => {
    const { data } = await apiClient.get('/sales/outstanding/summary');
    return data;
  },
};
