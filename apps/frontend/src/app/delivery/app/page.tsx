'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ordersApi, type Order } from '@/lib/api/orders';
import { deliveryApi } from '@/lib/api/delivery';
import { getAccessToken } from '@/lib/auth/storage';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

type OrderStatusChangedEvent = {
  orderId: string;
  status: string;
  customer?: {
    name?: string | null;
    phone?: string | null;
  } | null;
  order?: {
    id?: string;
    orderNumber?: number | null;
    totalCents?: number;
    shippingZoneSlug?: string | null;
    shippingMethodCode?: string | null;
  } | null;
};

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  PREPARING: 'Preparando',
  SHIPPED: 'En camino',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada'
};

const statusColor: Record<string, string> = {
  PENDING: 'bg-zinc-800 text-zinc-200',
  CONFIRMED: 'bg-amber-400/10 text-amber-300 border border-amber-400/40',
  PREPARING: 'bg-blue-400/10 text-blue-300 border border-blue-400/40',
  SHIPPED: 'bg-purple-400/10 text-purple-300 border border-purple-400/40',
  DELIVERED: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/40',
  CANCELLED: 'bg-red-400/10 text-red-300 border border-red-400/40'
};

const formatCurrency = (cents: number) => (cents / 100).toFixed(2);

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit'
  });

const isDeliveryOrder = (order: Order) =>
  !!order.shippingMethodCode || !!order.shippingZoneSlug || !!order.shippingCostCents;

const nextStatus = (status: string) => {
  if (status === 'CONFIRMED') return 'PREPARING';
  if (status === 'PREPARING') return 'SHIPPED';
  if (status === 'SHIPPED') return 'DELIVERED';
  return null;
};

export default function DeliveryAppPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpOrderId, setOtpOrderId] = useState<string | null>(null);

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
        const response = await ordersApi.list({ limit: 50 });
        setOrders(response.data.data);
      } catch {
        setError('No se pudieron cargar las entregas.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  useWebSocket<OrderStatusChangedEvent>('order_status_changed', payload => {
    setOrders(prev =>
      prev.map(order =>
        order.id === payload.orderId
          ? {
              ...order,
              status: payload.status,
              customer: payload.customer || order.customer,
              shippingZoneSlug:
                payload.order?.shippingZoneSlug ?? order.shippingZoneSlug,
              shippingMethodCode:
                payload.order?.shippingMethodCode ?? order.shippingMethodCode
            }
          : order
      )
    );
  });

  const deliveryOrders = useMemo(
    () => orders.filter(isDeliveryOrder),
    [orders]
  );

  const activeOrders = useMemo(
    () =>
      deliveryOrders.filter(order =>
        ['CONFIRMED', 'PREPARING', 'SHIPPED'].includes(order.status)
      ),
    [deliveryOrders]
  );

  const completedOrders = useMemo(
    () =>
      deliveryOrders.filter(order => order.status === 'DELIVERED'),
    [deliveryOrders]
  );

  const handleAdvanceStatus = async (order: Order) => {
    if (order.status === 'SHIPPED') {
      setOtpOrderId(order.id);
      setOtpCode('');
      setOtpError(null);
      setOtpModalOpen(true);
      return;
    }
    const target = nextStatus(order.status);
    if (!target) return;
    setUpdatingId(order.id);
    try {
      const response = await ordersApi.updateStatus(order.id, target);
      const updated = response.data;
      setOrders(prev =>
        prev.map(o =>
          o.id === order.id ? { ...o, status: updated.status } : o
        )
      );
    } catch {
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmOtp = async () => {
    if (!otpOrderId) return;
    if (otpCode.length !== 6) {
      setOtpError('El código debe tener 6 dígitos');
      return;
    }
    setUpdatingId(otpOrderId);
    try {
      await deliveryApi.confirmOtp(otpOrderId, otpCode);
      setOrders(prev =>
        prev.map(o =>
          o.id === otpOrderId ? { ...o, status: 'DELIVERED' } : o
        )
      );
      setOtpModalOpen(false);
      setOtpOrderId(null);
      setOtpCode('');
      setOtpError(null);
    } catch (err) {
      const anyErr = err as { response?: { data?: { code?: string; error?: string } } };
      const code = anyErr.response?.data?.code;
      const errorMessage = anyErr.response?.data?.error;
      const message =
        code === 'DELIVERY_OTP_INVALID'
          ? 'Código incorrecto. Verifica con el cliente.'
          : errorMessage || 'Error al confirmar entrega';
      setOtpError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-[var(--muted)]">
        Cargando entregas...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg">
        {error}
      </div>
    );
  }

  if (!deliveryOrders.length) {
    return (
      <div className="p-4 space-y-3">
        <h1 className="text-base font-semibold text-[var(--foreground)]">
          Entregas
        </h1>
        <p className="text-sm text-[var(--muted)]">
          No hay pedidos con envío registrados todavía.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[var(--foreground)]">
            Entregas
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Revisa pedidos con envío y marca el avance de la entrega.
          </p>
        </div>
        <Link
          href="/dashboard/orders"
          className="text-[11px] text-[var(--muted)] underline-offset-2 hover:underline"
        >
          Ir al listado completo
        </Link>
      </header>

      {!!activeOrders.length && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            En curso
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeOrders.map(order => {
              const code = order.orderNumber
                ? `#${order.orderNumber}`
                : order.id.slice(0, 8).toUpperCase();
              const label = statusLabel[order.status] || order.status;
              const color = statusColor[order.status] || statusColor.PENDING;
              const target = nextStatus(order.status);
              const actionLabel =
                order.status === 'CONFIRMED'
                  ? 'Preparando'
                  : order.status === 'PREPARING'
                  ? 'En camino'
                  : order.status === 'SHIPPED'
                  ? 'Entregada'
                  : null;
              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-[var(--foreground)]">
                        Pedido {code}
                      </div>
                      <div className="text-[11px] text-[var(--muted)]">
                        {order.customer?.name || 'Cliente sin nombre'}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${color}`}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-[var(--muted)]">
                    {order.customer?.phone && (
                      <div>📱 {order.customer.phone}</div>
                    )}
                    {order.deliveryAddress ? (
                       <div className="line-clamp-2" title={order.deliveryAddress}>
                         📍 {order.deliveryAddress}
                       </div>
                    ) : order.shippingZoneSlug ? (
                      <div>📍 Zona: {order.shippingZoneSlug}</div>
                    ) : null}
                    {order.shippingMethodCode && (
                      <div>🚚 Método: {order.shippingMethodCode}</div>
                    )}
                    {order.shippingCostCents && order.shippingCostCents > 0 && (
                      <div>📦 Envío: ${formatCurrency(order.shippingCostCents)}</div>
                    )}
                    <div>
                      💵 Total: ${formatCurrency(order.totalCents)} ·{' '}
                      {formatTime(order.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-[11px] text-[var(--muted)] underline-offset-2 hover:underline"
                    >
                      Ver detalle
                    </Link>
                    {target && actionLabel && (
                      <button
                        type="button"
                        onClick={() => handleAdvanceStatus(order)}
                        disabled={updatingId === order.id}
                        className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-black disabled:opacity-70"
                      >
                        {updatingId === order.id
                          ? 'Actualizando...'
                          : actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!!completedOrders.length && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Entregadas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completedOrders.map(order => {
              const code = order.orderNumber
                ? `#${order.orderNumber}`
                : order.id.slice(0, 8).toUpperCase();
              const label = statusLabel[order.status] || order.status;
              const color = statusColor[order.status] || statusColor.PENDING;
              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-[var(--foreground)]">
                        Pedido {code}
                      </div>
                      <div className="text-[11px] text-[var(--muted)]">
                        {order.customer?.name || 'Cliente sin nombre'}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${color}`}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-[var(--muted)]">
                    {order.customer?.phone && (
                      <div>📱 {order.customer.phone}</div>
                    )}
                    {order.deliveryAddress ? (
                       <div className="line-clamp-2" title={order.deliveryAddress}>
                         📍 {order.deliveryAddress}
                       </div>
                    ) : order.shippingZoneSlug ? (
                      <div>📍 Zona: {order.shippingZoneSlug}</div>
                    ) : null}
                    {order.shippingMethodCode && (
                      <div>🚚 Método: {order.shippingMethodCode}</div>
                    )}
                    <div>
                      💵 Total: ${formatCurrency(order.totalCents)} ·{' '}
                      {formatTime(order.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-[11px] text-[var(--muted)] underline-offset-2 hover:underline"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {otpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
            <h3 className="mb-3 text-sm font-bold text-zinc-100">
              Confirmar entrega
            </h3>
            <p className="mb-4 text-xs text-zinc-400">
              Ingresa el código OTP que el cliente debe proporcionarte.
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otpCode}
              onChange={e => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtpCode(value);
                setOtpError(null);
              }}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-lg font-mono tracking-widest text-zinc-100 placeholder-zinc-500 focus:border-[var(--accent)] focus:outline-none"
              placeholder="000000"
              autoFocus
            />
            {otpError && (
              <p className="mt-2 text-xs text-red-400">{otpError}</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOtpModalOpen(false);
                  setOtpOrderId(null);
                  setOtpCode('');
                  setOtpError(null);
                }}
                className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmOtp}
                disabled={otpCode.length !== 6 || !otpOrderId}
                className="flex-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-bold text-black disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
