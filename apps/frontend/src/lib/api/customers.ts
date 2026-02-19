import { api } from './client';
import { getAccessToken } from '../auth/storage';

export type Customer = {
  id: string;
  phone: string | null;
  name: string | null;
  email: string | null;
  address: string | null;
  addressNotes: string | null;
  identification: string | null;
  preferences: unknown;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
  };
  orders?: Array<{
    createdAt: string;
    totalCents: number;
    items?: Array<{
      quantity: number;
      product: {
        name: string;
      };
    }>;
  }>;
  conversations?: Array<{
    id: string;
    channel: string;
    status: string;
    updatedAt: string;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: string;
    }>;
  }>;
};

export type CustomersResponse = {
  data: Customer[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`
  };
};

export const customersApi = {
  list(params?: { page?: number; limit?: number; search?: string }) {
    return api.get<CustomersResponse>('/customers', {
      params,
      headers: authHeaders()
    });
  },
  getById(id: string) {
    return api.get<Customer>(`/customers/${id}`, {
      headers: authHeaders()
    });
  },
  update(id: string, data: Partial<Pick<Customer, 'name' | 'email' | 'phone' | 'address' | 'addressNotes' | 'identification' | 'preferences'>>) {
    return api.patch<Customer>(`/customers/${id}`, data, {
      headers: authHeaders()
    });
  }
};
