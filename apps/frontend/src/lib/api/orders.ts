import { api } from './client';
import { getAccessToken } from '../auth/storage';

export type OrderCustomer = {
  name?: string | null;
  phone?: string | null;
};

export type Order = {
  id: string;
  orderNumber: number | null;
  status: string;
  totalCents: number;
  createdAt: string;
  customer?: OrderCustomer | null;
};

export type OrderItem = {
  id: string;
  quantity: number;
  unitPriceCents: number;
  product?: {
    name?: string | null;
  } | null;
};

export type OrderDetail = Order & {
  paymentMethod?: string | null;
  exchangeRate?: number | null;
  deliveryAddress?: string | null;
  notes?: string | null;
  items?: OrderItem[];
  payments?: Array<{
    id: string;
    orderId: string;
    method: string;
    amountCents: number;
    currency: string;
    reference?: string | null;
    imageUrl?: string | null;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    verifiedBy?: string | null;
    verifiedAt?: string | null;
    notes?: string | null;
    createdAt: string;
  }>;
};

export type OrderListResponse = {
  data: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`
  };
};

export const ordersApi = {
  list(params?: { status?: string; page?: number; limit?: number }) {
    return api.get<OrderListResponse>('/orders', {
      params,
      headers: authHeaders()
    });
  },
  getById(id: string) {
    return api.get<OrderDetail>(`/orders/${id}`, {
      headers: authHeaders()
    });
  },
  updateStatus(id: string, status: string) {
    return api.patch<OrderDetail>(
      `/orders/${id}/status`,
      { status },
      {
        headers: authHeaders()
      }
    );
  }
};
