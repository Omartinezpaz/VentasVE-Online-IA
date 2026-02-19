import { api } from './client';
import { getAccessToken } from '../auth/storage';

export type Payment = {
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
  order?: {
    id: string;
    orderNumber?: number | null;
    totalCents: number;
    customer?: {
      name?: string | null;
      phone?: string | null;
    } | null;
  };
};

export type PaymentsResponse = {
  data: Payment[];
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

export const paymentsApi = {
  list(params?: { status?: string; orderId?: string; page?: number; limit?: number }) {
    return api.get<PaymentsResponse>('/payments', {
      params,
      headers: authHeaders()
    });
  },
  create(data: { orderId: string; method: string; reference?: string; imageUrl?: string; notes?: string }) {
    return api.post<Payment>('/payments', data, {
      headers: authHeaders()
    });
  },
  verify(id: string, status: 'VERIFIED' | 'REJECTED', notes?: string) {
    return api.patch<Payment>(`/payments/${id}/verify`, { status, notes }, {
      headers: authHeaders()
    });
  }
};

