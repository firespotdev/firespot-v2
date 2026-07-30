import { apiClient, publicApiClient } from '@/lib/utils/axios';
import { getCustomerFingerprint } from '@/lib/utils/customer-fingerprint';
import {
  ArchiveAllSalesResult,
  ConfirmAllSalesResult,
  CustomerSale,
  PublicSale,
  Sale,
  SalesStats,
  SalesResponse,
} from './interface';

export interface CreatePendingSalePayload {
  merchantId: string;
  customerFingerprint?: string;
  customerType?: 'New' | 'Repeat';
  customerName?: string;
  source?: 'QR scan' | 'Link shared' | 'Manual';
  targetBankName?: string;
  serialNumber?: string;
  amount?: number;
  description?: string;
  items?: any[];
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
  dueDate?: string;
}

export interface EditSalePayload {
  amount?: number;
  description?: string;
  paymentMethod?: string;
}

export const SalesApi = {
  createPendingSale: async (
    payload: CreatePendingSalePayload,
  ): Promise<Sale> => {
    const { data } = await publicApiClient.post('/sales/pending', payload);
    return data;
  },

  createPendingCollectSale: async (
    payload: CreatePendingSalePayload,
  ): Promise<Sale> => {
    const { data } = await apiClient.post('/sales/collect', payload);
    return data;
  },

  createManualSale: async (payload: RecordSalePayload): Promise<Sale> => {
    const { data } = await apiClient.post('/sales', payload);
    return data;
  },

  getSales: async (
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<SalesResponse> => {
    const { data } = await apiClient.get('/sales', { params });
    return data;
  },

  getSale: async (id: string): Promise<Sale> => {
    const { data } = await apiClient.get(`/sales/${id}`);
    return data;
  },

  getCustomerHistory: async (): Promise<CustomerSale[]> => {
    const { data } = await apiClient.get('/sales/customer/history');
    return data;
  },

  getSalesStats: async (
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<SalesStats> => {
    const { data } = await apiClient.get('/sales/stats', { params });
    return data;
  },

  recordSale: async (
    saleId: string,
    payload: RecordSalePayload,
  ): Promise<Sale> => {
    const { data } = await apiClient.patch(`/sales/${saleId}/record`, payload);
    return data;
  },

  confirmSale: async (saleId: string): Promise<Sale> => {
    const { data } = await apiClient.patch(`/sales/${saleId}/confirm`);
    return data;
  },

  confirmAllSales: async (): Promise<ConfirmAllSalesResult> => {
    const { data } = await apiClient.patch('/sales/confirm-all');
    return data;
  },

  archiveAllPendingSales: async (): Promise<ArchiveAllSalesResult> => {
    const { data } = await apiClient.patch('/sales/archive-all');
    return data;
  },

  archiveCustomerOutstandingSales: async (
    customerId: string,
  ): Promise<ArchiveAllSalesResult> => {
    const { data } = await apiClient.patch(
      `/sales/outstanding/customer/${customerId}/archive`,
    );
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

  recordRepayment: async (
    saleId: string,
    payload: {
      amountPaid: number;
      paymentMethod?: string;
      customerId?: string;
    },
  ): Promise<any> => {
    const { data } = await apiClient.post(
      `/sales/${saleId}/repayment`,
      payload,
    );
    return data;
  },

  getCustomerOutstandingSales: async (customerId: string): Promise<Sale[]> => {
    const { data } = await apiClient.get(
      `/sales/customer/${customerId}/outstanding`,
    );
    return data;
  },

  getPublicSale: async (
    saleId: string,
    serialNumber: string,
  ): Promise<PublicSale> => {
    const { data } = await publicApiClient.get(`/sales/${saleId}/public`, {
      params: { serialNumber },
    });
    return data;
  },

  cancelSaleAsCustomer: async (
    saleId: string,
    serialNumber: string,
  ): Promise<PublicSale> => {
    const { data } = await publicApiClient.patch(
      `/sales/${saleId}/customer-cancel`,
      { serialNumber },
    );
    return data;
  },

  markSalePaidByCustomer: async (
    saleId: string,
    serialNumber: string,
  ): Promise<PublicSale> => {
    const { data } = await publicApiClient.patch(
      `/sales/${saleId}/customer-paid`,
      { serialNumber },
      {
        headers: {
          'x-customer-fingerprint': getCustomerFingerprint(),
        },
      },
    );
    return data;
  },

  uploadReceipt: async (
    saleId: string,
    serialNumber: string,
    file: File,
    signal?: AbortSignal,
  ): Promise<Sale> => {
    const formData = new FormData();
    formData.append('receipt', file);
    const { data } = await publicApiClient.post(
      `/sales/${saleId}/receipt`,
      formData,
      {
        params: { serialNumber },
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-customer-fingerprint': getCustomerFingerprint(),
        },
        signal,
      },
    );
    return data;
  },

  deleteReceipt: async (
    saleId: string,
    serialNumber: string,
  ): Promise<Sale> => {
    const { data } = await publicApiClient.delete(`/sales/${saleId}/receipt`, {
      params: { serialNumber },
      headers: {
        'x-customer-fingerprint': getCustomerFingerprint(),
      },
    });
    return data;
  },

  recordScan: async (saleId: string): Promise<Sale> => {
    const { data } = await publicApiClient.patch(`/sales/${saleId}/scan`);
    return data;
  },

  recordCopy: async (
    saleId: string,
    payload: {
      serialNumber: string;
      targetBankName?: string;
      targetAccountNumber?: string;
      sourceBankName?: string;
    },
  ): Promise<Sale> => {
    const { data } = await publicApiClient.patch(
      `/sales/${saleId}/copy`,
      payload,
      {
        headers: {
          'x-customer-fingerprint': getCustomerFingerprint(),
        },
      },
    );
    return data;
  },

  claimSalePayer: async (saleId: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.patch(`/sales/${saleId}/claim`);
    return data;
  },

  getOutstandingSummary: async (): Promise<{
    totalOutstandingAmount: number;
    customers: Array<{
      customerId: string;
      customerUserId: string;
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
