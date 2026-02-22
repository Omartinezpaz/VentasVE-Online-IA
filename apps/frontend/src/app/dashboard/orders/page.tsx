'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ordersApi, type Order } from '@/lib/api/orders';
import { getAccessToken } from '@/lib/auth/storage';

const formatCurrency = (cents: number) => (cents / 100).toFixed(2);

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

const statusLabel: Record<string, string> = {
  PENDING:   'Pendiente',
  CONFIRMED: 'Confirmada',
  PREPARING: 'Preparando',
  SHIPPED:   'Enviada',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

const statusColor: Record<string, string> = {
  PENDING:   'bg-zinc-800 text-zinc-200',
  CONFIRMED: 'bg-amber-400/10 text-amber-300 border border-amber-400/40',
  PREPARING: 'bg-blue-400/10 text-blue-300 border border-blue-400/40',
  SHIPPED:   'bg-purple-400/10 text-purple-300 border border-purple-400/40',
  DELIVERED: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/40',
  CANCELLED: 'bg-red-400/10 text-red-300 border border-red-400/40',
};

export default function OrdersListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | keyof typeof statusLabel>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: { page: number; limit: number; status?: string } = { page, limit: 20 };
        if (statusFilter !== 'ALL') {
          params.status = statusFilter;
        }
        const response = await ordersApi.list(params);
        setOrders(response.data.data);
        setTotalPages(response.data.meta.totalPages);
      } catch {
        setError('No se pudieron cargar las órdenes');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, page, statusFilter]);

  const handlePrev = () => {
    setPage(prev => (prev > 1 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setPage(prev => (prev < totalPages ? prev + 1 : prev));
  };

  const filteredOrders = orders.filter(order => {
    const created = new Date(order.createdAt).getTime();
    if (dateFrom) {
      const fromTs = new Date(dateFrom).getTime();
      if (created < fromTs) return false;
    }
    if (dateTo) {
      const toTs = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      if (created > toTs) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-50">Órdenes</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Lista de pedidos recientes con método, zona y costo de envío.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 text-[11px] text-zinc-400">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide">Estado</label>
          <select
            value={statusFilter}
            onChange={e =>
              setStatusFilter(e.target.value === 'ALL' ? 'ALL' : e.target.value as keyof typeof statusLabel)
            }
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
          >
            <option value="ALL">Todos</option>
            {Object.keys(statusLabel).map(key => (
              <option key={key} value={key}>
                {statusLabel[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
          <span>⚠</span>
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/80">
        <table className="min-w-full text-xs">
          <thead className="bg-zinc-900/80 border-b border-zinc-800">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Orden</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Cliente</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Fecha</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Monto</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Pago</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Envío</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading && (
              <tr>
                <td className="px-3 py-6 text-center text-zinc-500" colSpan={7}>
                  Cargando órdenes…
                </td>
              </tr>
            )}
            {!loading && filteredOrders.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-zinc-500" colSpan={7}>
                  No hay órdenes registradas todavía.
                </td>
              </tr>
            )}
            {!loading && filteredOrders.map(order => {
              const orderTitle = order.orderNumber
                ? `#${order.orderNumber}`
                : order.id.slice(0, 8).toUpperCase();

              const shippingCostLabel =
                order.shippingCostCents == null
                  ? '—'
                  : order.shippingCostCents === 0
                    ? 'Gratis'
                    : `$${formatCurrency(order.shippingCostCents)}`;

              return (
                <tr
                  key={order.id}
                  className="hover:bg-zinc-900 cursor-pointer"
                  onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                >
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-zinc-100">
                        {orderTitle}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-100">
                        {order.customer?.name || 'Cliente sin nombre'}
                      </span>
                      {order.customer?.phone && (
                        <span className="text-[10px] text-zinc-500">
                          {order.customer.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-zinc-400">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="text-xs font-semibold text-zinc-100">
                      ${formatCurrency(order.totalCents)}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="text-[11px] text-zinc-200">
                      {order.paymentMethod || 'No definido'}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-zinc-200">
                        {order.shippingMethodCode || 'Sin método'}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {order.shippingZoneSlug || 'Sin zona'}
                      </span>
                      <span className="inline-flex w-fit items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-100">
                        {shippingCostLabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        statusColor[order.status] ?? 'bg-zinc-800 text-zinc-200'
                      }`}
                    >
                      {statusLabel[order.status] ?? order.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <div>
          Página {page} de {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            disabled={page <= 1}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1 disabled:opacity-50 text-xs"
          >
            Anterior
          </button>
          <button
            onClick={handleNext}
            disabled={page >= totalPages}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1 disabled:opacity-50 text-xs"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
