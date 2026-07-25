import { apiClient } from '@/lib/utils/axios';

export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  variants?: Array<{
    size?: string;
    color?: string;
    price?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  price: number;
  category: string;
  variants?: Array<{ size?: string; color?: string; price?: number }>;
  imageUrl?: string;
}

export const ProductsApi = {
  getProducts: async (params?: { search?: string; category?: string }): Promise<Product[]> => {
    const { data } = await apiClient.get('/products', { params });
    return data;
  },

  createProduct: async (payload: CreateProductPayload): Promise<Product> => {
    const { data } = await apiClient.post('/products', payload);
    return data;
  },

  updateProduct: async (id: string, payload: Partial<CreateProductPayload>): Promise<Product> => {
    const { data } = await apiClient.patch(`/products/${id}`, payload);
    return data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },
};
