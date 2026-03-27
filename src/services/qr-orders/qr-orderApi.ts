import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/utils/axios';
import { QROrder, QROrderFilters } from './interface';

export const adminQROrdersApi = {
  getOrders: async (filters?: QROrderFilters): Promise<QROrder[]> => {
    const response = await adminApiClient.get<QROrder[]>('/admin/qr-orders', {
      params: filters,
    });
    return response.data;
  },

  getOrderById: async (id: string): Promise<QROrder> => {
    const response = await adminApiClient.get<QROrder>(`/admin/qr-orders/${id}`);
    return response.data;
  },

  updateOrderStatus: async (id: string, status: string): Promise<QROrder> => {
    const response = await adminApiClient.patch<QROrder>(`/admin/qr-orders/${id}/status`, {
      status,
    });
    return response.data;
  },
};

export const useAdminQROrders = (filters?: QROrderFilters) => {
  return useQuery({
    queryKey: ['admin-qr-orders', filters],
    queryFn: () => adminQROrdersApi.getOrders(filters),
  });
};

export const useAdminQROrder = (id: string | null) => {
  return useQuery({
    queryKey: ['admin-qr-order', id],
    queryFn: () => {
      if (!id) throw new Error('Order ID is required');
      return adminQROrdersApi.getOrderById(id);
    },
    enabled: !!id,
  });
};

export const useUpdateQROrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminQROrdersApi.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-qr-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-qr-order'] });
    },
  });
};
