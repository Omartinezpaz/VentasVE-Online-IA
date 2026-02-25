'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ordersApi, type Order } from '@/lib/api/orders';
import { getAccessToken } from '@/lib/auth/storage';
import { metaApi, type PaymentMethodMeta } from '@/lib/api/meta';

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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodMeta[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | string>('ALL');
  const [zoneFilter, setZoneFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [exporting, setExporting] = useState(false);

  const buildParams = () => {
    const params: {
      page: number;
      limit: number;
      status?: string;
      paymentMethod?: string;
      shippingZoneSlug?: string;
      minAmount?: number;
      maxAmount?: number;
      dateFrom?: string;
      dateTo?: string;
    } = { page, limit: 20 };

    if (statusFilter !== 'ALL') {
      params.status = statusFilter;
    }
    if (paymentFilter !== 'ALL') {
      params.paymentMethod = paymentFilter;
    }
    if (zoneFilter.trim()) {
      params.shippingZoneSlug = zoneFilter.trim();
    }
    const min = minAmount ? Number.parseFloat(minAmount.replace(',', '.')) : null;
    const max = maxAmount ? Number.parseFloat(maxAmount.replace(',', '.')) : null;
    if (min !== null && Number.isFinite(min)) {
      params.minAmount = min;
    }
    if (max !== null && Number.isFinite(max)) {
      params.maxAmount = max;
    }
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      params.dateFrom = fromDate.toISOString();
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      params.dateTo = toDate.toISOString();
    }

    return params;
  };

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
        const response = await ordersApi.list(buildParams());
        setOrders(response.data.data);
        setTotalPages(response.data.meta.totalPages);
      } catch {
        setError('No se pudieron cargar las órdenes. Intenta de nuevo en unos segundos.');
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, page, statusFilter, paymentFilter, zoneFilter, minAmount, maxAmount, dateFrom, dateTo]);

  useEffect(() => {
    let active = true;
    metaApi
      .getPaymentMethods()
      .then(response => {
        if (!active) return;
        setPaymentMethods(response.data);
      })
      .catch(() => {
        if (!active) return;
        setPaymentMethods([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const handlePrev = () => {
    setPage(prev => (prev > 1 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setPage(prev => (prev < totalPages ? prev + 1 : prev));
  };

  const filteredOrders = orders;

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const response = await ordersApi.export(buildParams());
      const data = response.data;
      const blob =
        data instanceof Blob ? data : new Blob([data], { type: 'text/csv; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `orders-${date}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError('No se pudieron exportar las órdenes. Intenta de nuevo en unos segundos.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-zinc-50">Órdenes</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Lista de pedidos recientes con método, zona y costo de envío.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading || exporting}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-100 disabled:opacity-50"
        >
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 text-[11px] text-zinc-400">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide">Estado</label>
          <select
            value={statusFilter}
            onChange={e =>
              setStatusFilter(
                e.target.value === 'ALL' ? 'ALL' : (e.target.value as keyof typeof statusLabel)
              )
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
          <label className="text-[10px] uppercase tracking-wide">Método de pago</label>
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 min-w-[140px]"
          >
            <option value="ALL">Todos</option>
            {paymentMethods.map(pm => (
              <option key={pm.id} value={pm.codigo}>
                {pm.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide">Zona de envío</label>
          <input
            type="text"
            value={zoneFilter}
            onChange={e => setZoneFilter(e.target.value)}
            placeholder="Slug o etiqueta"
            className="min-w-[150px] rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide">Desde (USD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={minAmount}
            onChange={e => setMinAmount(e.target.value)}
            placeholder="0.00"
            className="w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide">Hasta (USD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={maxAmount}
            onChange={e => setMaxAmount(e.target.value)}
            placeholder="Todo"
            className="w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide">Rango fecha</label>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
            />
            <span className="px-1 text-[10px] text-zinc-500">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
            />
          </div>
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
                  No hay órdenes que coincidan con los filtros actuales.
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
