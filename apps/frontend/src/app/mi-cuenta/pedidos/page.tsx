'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { customerOrdersApi, type CustomerOrder } from '@/lib/api/customer-orders';

const formatCurrency = (cents: number) => (cents / 100).toFixed(2);

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  PREPARING: 'Preparando',
  SHIPPED: 'Enviada',
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

export default function MisPedidosPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    customerOrdersApi
      .listMine()
      .then(response => {
        if (!active) return;
        setOrders(response.data.data);
      })
      .catch(() => {
        if (!active) return;
        setError('No pudimos cargar tus pedidos. Inicia sesión nuevamente.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasOrders = orders.length > 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(245,200,66,0.08),_transparent_55%),_radial-gradient(ellipse_at_bottom,_rgba(79,142,247,0.07),_transparent_55%),_#050712] text-zinc-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold">Mis pedidos</h1>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Revisa el historial de compras asociadas a tu cuenta.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-zinc-50"
          >
            Ir al catálogo
          </Link>
        </header>

        {loading && (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-2xl border border-white/5 bg-white/5"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[12px] text-red-100">
            {error}
          </div>
        )}

        {!loading && !error && !hasOrders && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 px-4 py-5 text-center text-[13px] text-zinc-300">
            <div className="mb-2 text-2xl">🧾</div>
            <p>Aún no tienes pedidos registrados con esta cuenta.</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              Realiza una compra desde el catálogo para ver tu historial aquí.
            </p>
          </div>
        )}

        {!loading && !error && hasOrders && (
          <div className="mt-4 space-y-3 pb-6">
            {orders.map(order => {
              const shippingCostLabel =
                order.shippingCostCents == null
                  ? '—'
                  : order.shippingCostCents === 0
                    ? 'Gratis'
                    : `$${formatCurrency(order.shippingCostCents)}`;
              const products = order.items ?? [];
              const summary =
                products.length > 0
                  ? products
                      .map(item => `${item.quantity} x ${item.product.name}`)
                      .join(', ')
                  : 'Sin detalle de productos';
              const statusKey = order.status || 'PENDING';

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-[12px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-zinc-400">
                        {formatDateTime(order.createdAt)}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-zinc-50">
                        ${formatCurrency(order.totalCents)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[statusKey] || statusColor.PENDING}`}
                      >
                        {statusLabel[statusKey] || statusLabel.PENDING}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {order.shippingMethodCode || 'Sin método de envío'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-300">
                    <div className="flex-1 min-w-0">
                      <div className="line-clamp-2 break-words">{summary}</div>
                    </div>
                    <div className="flex flex-col items-end text-[10px] text-zinc-400">
                      <span>{order.shippingZoneSlug || 'Sin zona'}</span>
                      <span className="mt-0.5 inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-100">
                        Envío: {shippingCostLabel}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

