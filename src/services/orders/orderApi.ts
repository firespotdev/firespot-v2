import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/utils/axios';
import { Order, OrderFilters } from './interface';

export const adminOrdersApi = {
  getOrders: async (filters?: OrderFilters): Promise<Order[]> => {
    const response = await adminApiClient.get<Order[]>('/admin/orders', {
      params: filters,
    });
    return response.data;
  },

  getOrderById: async (id: string): Promise<Order> => {
    const response = await adminApiClient.get<Order>(`/admin/orders/${id}`);
    return response.data;
  },

  updateOrderStatus: async (id: string, status: string): Promise<Order> => {
    const response = await adminApiClient.patch<Order>(`/admin/orders/${id}/status`, {
      status,
    });
    return response.data;
  },
};

export const useAdminOrders = (filters?: OrderFilters) => {
  return useQuery({
    queryKey: ['admin-orders', filters],
    queryFn: () => adminOrdersApi.getOrders(filters),
  });
};

export const useAdminOrder = (id: string | null) => {
  return useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => {
      if (!id) throw new Error('Order ID is required');
      return adminOrdersApi.getOrderById(id);
    },
    enabled: !!id,
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminOrdersApi.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order'] });
    },
  });
};
