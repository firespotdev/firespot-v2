import { apiClient } from '@/lib/utils/axios';

export interface Customer {
  _id: string;
  name: string;
  phoneNumber: string;
  profilePhotoUrl?: string;
  userId?: string;
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
  sales: any[];
  feedback: any[];
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

  createCustomer: async (payload: CreateCustomerPayload): Promise<Customer> => {
    const { data } = await apiClient.post('/customers', payload);
    return data;
  },
};
