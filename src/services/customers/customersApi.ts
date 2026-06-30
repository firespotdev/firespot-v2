import { apiClient } from '@/lib/utils/axios';

export interface Customer {
  _id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  name: string;
  phoneNumber: string;
  email?: string;
}

export const CustomersApi = {
  getCustomers: async (): Promise<Customer[]> => {
    const { data } = await apiClient.get('/customers');
    return data;
  },

  createCustomer: async (payload: CreateCustomerPayload): Promise<Customer> => {
    const { data } = await apiClient.post('/customers', payload);
    return data;
  },
};
