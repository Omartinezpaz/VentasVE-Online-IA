import { api } from './client';
import { getCustomerAccessToken } from '../auth/customer-storage';

export type CustomerOrderItem = {
  quantity: number;
  product: {
    name: string;
  };
};

export type CustomerOrder = {
  id: string;
  createdAt: string;
  totalCents: number;
  status?: string;
  shippingZoneSlug?: string | null;
  shippingCostCents?: number | null;
  shippingMethodCode?: string | null;
  items?: CustomerOrderItem[];
};

export type CustomerOrdersResponse = {
  data: CustomerOrder[];
};

const authHeaders = () => {
  const token = getCustomerAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`
  };
};

export const customerOrdersApi = {
  listMine() {
    return api.get<CustomerOrdersResponse>('/customers/me/orders', {
      headers: authHeaders()
    });
  }
};

