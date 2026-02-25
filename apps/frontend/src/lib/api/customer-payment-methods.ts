import { api } from './client';
import { getCustomerAccessToken } from '../auth/customer-storage';

export type CustomerPaymentMethod = {
  id: string;
  customerId: string;
  type: string;
  details: unknown;
  nickname: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerPaymentMethodListResponse = {
  data: CustomerPaymentMethod[];
};

export type CustomerPaymentMethodResponse = {
  data: CustomerPaymentMethod;
};

const authHeaders = () => {
  const token = getCustomerAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`
  };
};

export const customerPaymentMethodsApi = {
  list() {
    return api.get<CustomerPaymentMethodListResponse>('/customers/me/payment-methods', {
      headers: authHeaders()
    });
  },
  create(data: {
    type: string;
    details: unknown;
    nickname?: string;
    isDefault?: boolean;
  }) {
    return api.post<CustomerPaymentMethodResponse>('/customers/me/payment-methods', data, {
      headers: authHeaders()
    });
  },
  update(
    id: string,
    data: {
      details?: unknown;
      nickname?: string;
      isDefault?: boolean;
      isActive?: boolean;
    }
  ) {
    return api.patch<CustomerPaymentMethodResponse>(
      `/customers/me/payment-methods/${id}`,
      data,
      {
        headers: authHeaders()
      }
    );
  },
  remove(id: string) {
    return api.delete<void>(`/customers/me/payment-methods/${id}`, {
      headers: authHeaders()
    });
  },
  setDefault(id: string) {
    return api.patch<CustomerPaymentMethodResponse>(
      `/customers/me/payment-methods/${id}/default`,
      {},
      {
        headers: authHeaders()
      }
    );
  }
};

