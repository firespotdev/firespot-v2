import { apiClient } from '@/lib/utils/axios';

export interface Report {
  _id: string;
  saleId: string;
  customerId: string;
  category: string;
  description: string;
  proofUrl?: string;
  proofPublicId?: string;
  status: 'pending' | 'in_review' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportPayload {
  saleId: string;
  category: string;
  description: string;
  proof?: File;
}

export const ReportsApi = {
  submitReport: async (payload: CreateReportPayload): Promise<Report> => {
    const formData = new FormData();
    formData.append('saleId', payload.saleId);
    formData.append('category', payload.category);
    formData.append('description', payload.description);
    if (payload.proof) {
      formData.append('proof', payload.proof);
    }
    const { data } = await apiClient.post('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getReports: async (): Promise<Report[]> => {
    const { data } = await apiClient.get('/reports');
    return data;
  },
};
