'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ordersApi, Order } from '@/lib/api/orders';
import { getAccessToken } from '@/lib/auth/storage';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

const formatCurrency = (cents: number) => {
  return (cents / 100).toFixed(2);
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

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

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRealtimeOrders, setHasRealtimeOrders] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    const load = async () => {
      try {
        const response = await ordersApi.list({ limit: 20 });
        setOrders(response.data.data);
      } catch {
        setError('No se pudieron cargar las órdenes');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  useWebSocket<{
    id: string;
    orderNumber?: number | null;
    status: string;
    totalCents: number;
    createdAt: string;
    customer?: {
      name?: string | null;
      phone?: string | null;
    };
  }>('new_order', data => {
    setHasRealtimeOrders(true);
    setOrders(prev => {
      const exists = prev.some(order => order.id === data.id);
      if (exists) {
        return prev;
      }
      const next: Order = {
        id: data.id,
        orderNumber: data.orderNumber ?? null,
        status: data.status,
        totalCents: data.totalCents,
        createdAt: data.createdAt,
        customer: data.customer
          ? {
              name: data.customer.name,
              phone: data.customer.phone
            }
          : undefined
      };
      return [next, ...prev];
    });
  });

  useWebSocket<{ orderId: string; status: string }>(
    'order_status_changed',
    payload => {
      setOrders(prev =>
        prev.map(order =>
          order.id === payload.orderId
            ? {
                ...order,
                status: payload.status
              }
            : order
        )
      );
    }
  );

  if (loading) {
    return (
      <div className="py-6 text-sm text-zinc-400">
        Cargando órdenes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-sm text-zinc-400">
        Aún no tienes órdenes. Comparte tu catálogo público para empezar a recibir pedidos.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-50">
            Órdenes recientes
          </h2>
          <p className="text-xs text-zinc-500">
            Ultimos pedidos recibidos desde tu catálogo y canales conectados.
          </p>
        </div>
        {hasRealtimeOrders && (
          <div className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            Recibiendo órdenes en tiempo real
          </div>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
        <table className="min-w-full divide-y divide-zinc-800 text-xs">
          <thead className="bg-zinc-900/80">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Orden
              </th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Cliente
              </th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Monto
              </th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Estado
              </th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {orders.map(order => (
              <tr
                key={order.id}
                className="cursor-pointer hover:bg-zinc-900/80"
                onClick={() => router.push(`/dashboard/orders/${order.id}`)}
              >
                <td className="whitespace-nowrap px-3 py-2 font-medium text-zinc-100">
                  {order.orderNumber ? `#${order.orderNumber}` : order.id.slice(0, 8)}
                </td>
                <td className="px-3 py-2 text-zinc-200">
                  <div className="flex flex-col">
                    <span className="truncate">
                      {order.customer?.name || 'Cliente sin nombre'}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {order.customer?.phone || 'Sin teléfono'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-zinc-200">
                  ${formatCurrency(order.totalCents)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      statusColor[order.status] || 'bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    {statusLabel[order.status] || order.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  {formatDate(order.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
