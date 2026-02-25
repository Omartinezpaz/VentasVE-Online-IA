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
  topProducts?: Array<{
    productId: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      priceUsdCents: number;
      costCents?: number | null;
      stock: number;
    } | null;
  }>;
  lowStock?: {
    threshold: number;
    products: Array<{
      id: string;
      name: string;
      stock: number;
    }>;
  };
  conversion?: {
    orders: number;
    visits: number;
    rate: number;
  };
  salesSeries?: Array<{
    date: string;
    usdCents: number;
  }>;
  overview?: {
    orders: number;
    salesUsdCents: number;
    avgTicketUsdCents: number;
    marginUsdCents: number;
    marginPercent: number | null;
  };
};

const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export const metricsApi = {
  getStats(params?: { period?: 'day' | 'week' | 'month'; seriesDays?: number }) {
    return api.get<DashboardStats>('/dashboard/stats', {
      params,
      headers: authHeaders()
    });
  },
  exportStats(params?: { period?: 'day' | 'week' | 'month'; seriesDays?: number }) {
    return api.get<Blob>('/dashboard/stats/export', {
      params,
      headers: {
        ...authHeaders(),
        Accept: 'text/csv'
      },
      responseType: 'blob'
    });
  }
};
