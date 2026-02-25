import { api } from './client';
import { getCustomerAccessToken } from '../auth/customer-storage';

export type CustomerAddress = {
  id: string;
  customerId: string;
  label: string | null;
  street: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
  latitude: number | null;
  longitude: number | null;
  timesUsed: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerAddressListResponse = {
  data: CustomerAddress[];
};

export type CustomerAddressResponse = {
  data: CustomerAddress;
};

const authHeaders = () => {
  const token = getCustomerAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`
  };
};

export const customerAddressesApi = {
  list() {
    return api.get<CustomerAddressListResponse>('/customers/me/addresses', {
      headers: authHeaders()
    });
  },
  create(data: {
    label?: string;
    street: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isDefault?: boolean;
    latitude?: number;
    longitude?: number;
  }) {
    return api.post<CustomerAddressResponse>('/customers/me/addresses', data, {
      headers: authHeaders()
    });
  },
  update(
    id: string,
    data: {
      label?: string;
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      isDefault?: boolean;
      latitude?: number | null;
      longitude?: number | null;
    }
  ) {
    return api.patch<CustomerAddressResponse>(`/customers/me/addresses/${id}`, data, {
      headers: authHeaders()
    });
  },
  remove(id: string) {
    return api.delete<void>(`/customers/me/addresses/${id}`, {
      headers: authHeaders()
    });
  },
  setDefault(id: string) {
    return api.patch<CustomerAddressResponse>(
      `/customers/me/addresses/${id}/default`,
      {},
      {
        headers: authHeaders()
      }
    );
  }
};

