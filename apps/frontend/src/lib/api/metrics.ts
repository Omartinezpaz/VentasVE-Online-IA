import { api } from './client';
import { getAccessToken } from '../auth/storage';

export type SalesAmounts = {
  usdCents: number;
  ves: number;
};

export type OrdersByStatus = {
  status: string;
  count: number;
};

export type DashboardStats = {
  sales: {
    day: SalesAmounts;
    week: SalesAmounts;
    month: SalesAmounts;
  };
  period: 'day' | 'week' | 'month';
  ordersByStatus: OrdersByStatus[];
  salesByPaymentMethod?: Array<{
    paymentMethod: string;
    orders: number;
    usdCents: number;
    ves: number;
  }>;
};

const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export const metricsApi = {
  getStats(params?: { period?: 'day' | 'week' | 'month' }) {
    return api.get<DashboardStats>('/dashboard/stats', {
      params,
      headers: authHeaders()
    });
  }
};
