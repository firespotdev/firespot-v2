import { apiClient } from '@/lib/utils/axios';
import type { Sale } from '@/services/sales/interface';

export interface Customer {
  _id: string;
  name: string;
  phoneNumber: string;
  profilePhotoUrl?: string;
  userId?: string;
  /** Saved with the bookmark on the customer's page. */
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  name: string;
  phoneNumber: string;
}

export interface CustomerDetails {
  customer: Customer;
  visitCount: number;
  totalSpent: number;
  totalOutstanding: number;
  sales: Sale[];
  feedback: CustomerFeedback[];
}

export interface CustomerFeedback {
  _id: string;
  rating?: number;
  comment?: string;
  customerPhotoUrl?: string;
  createdAt?: string;
}

export const CustomersApi = {
  getCustomers: async (): Promise<Customer[]> => {
    const { data } = await apiClient.get('/customers');
    return data;
  },

  getCustomerDetails: async (id: string): Promise<CustomerDetails> => {
    const { data } = await apiClient.get(`/customers/${id}`);
    return data;
  },

  setFavorite: async (id: string, isFavorite: boolean): Promise<Customer> => {
    const { data } = await apiClient.patch(`/customers/${id}/favorite`, {
      isFavorite,
    });
    return data;
  },

  createCustomer: async (payload: CreateCustomerPayload): Promise<Customer> => {
    const { data } = await apiClient.post('/customers', payload);
    return data;
  },
};
