'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { metricsApi, DashboardStats } from '@/lib/api/metrics';
import { paymentsApi, Payment } from '@/lib/api/payments';
import { ordersApi, Order } from '@/lib/api/orders';
import { chatApi, Conversation } from '@/lib/api/chat';
import { settingsApi, BusinessSettings } from '@/lib/api/settings';
import { getAccessToken } from '@/lib/auth/storage';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const formatVes = (value: number) =>
  `Bs. ${value.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`;

const formatPaymentAmount = (payment: Payment) => {
  const amount = payment.amountCents / 100;
  if (payment.currency === 'VES') {
    return `Bs. ${amount.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`;
  }
  return `$${amount.toFixed(2)}`;
};

export default function DashboardHome() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingPayments, setPendingPayments] = useState<number>(0);
  const [pendingPaymentsList, setPendingPaymentsList] = useState<Payment[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [conversationsTotal, setConversationsTotal] = useState<number>(0);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  const load = useCallback(
    async (p: 'day' | 'week' | 'month' = period) => {
      try {
        const [statsRes, paymentsRes, ordersRes, inboxRes, settingsRes] = await Promise.all([
          metricsApi.getStats({ period: p }),
          paymentsApi.list({ status: 'PENDING', page: 1, limit: 3 }),
          ordersApi.list({ page: 1, limit: 5 }),
          chatApi.list({ page: 1, limit: 20 }),
          settingsApi.get()
        ]);
        setStats(statsRes.data);
        setPendingPayments(paymentsRes.data.meta.total);
        setPendingPaymentsList(paymentsRes.data.data);
        setRecentOrders(ordersRes.data.data);
        const inboxData = inboxRes.data;
        const whatsappConversations = inboxData.data.filter(c => c.channel === 'WHATSAPP');
        setRecentConversations(whatsappConversations);
        setConversationsTotal(inboxData.meta.total);
        setBusinessSettings(settingsRes.data);
      } catch {
        setError('No se pudieron cargar las métricas');
      } finally {
        setLoading(false);
      }
    },
    [period]
  );

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    load(period);
  }, [router, load, period]);

  useWebSocket('new_order', () => {
    load(period);
  });
  useWebSocket('payment_verified', () => {
    load(period);
  });
  useWebSocket('new_payment', () => {
    setPendingPayments(prev => prev + 1);
  });

  const activeOrders = useMemo(() => {
    if (!stats) return 0;
    return stats.ordersByStatus
      .filter(s => ['PENDING', 'CONFIRMED', 'PREPARING'].includes(s.status))
      .reduce((acc, cur) => acc + cur.count, 0);
  }, [stats]);

  if (loading) {
    return (
      <div className="py-6 text-sm text-zinc-400">Cargando métricas...</div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
        {error || 'No se pudieron cargar las métricas'}
      </div>
    );
  }

  const cards = [
    {
      key: 'income',
      title: 'Ingresos hoy',
      value: formatUsd(stats.sales.day.usdCents),
      sub: formatVes(stats.sales.day.ves),
      accent: 'from-amber-400 to-yellow-300'
    },
    {
      key: 'orders',
      title: 'Pedidos activos',
      value: String(activeOrders),
      sub: 'Pendientes, confirmados y en preparación',
      accent: 'from-emerald-400 to-green-300'
    },
    {
      key: 'payments',
      title: 'Pagos pendientes',
      value: String(pendingPayments),
      sub: 'Pagos por verificar',
      accent: 'from-sky-400 to-blue-300'
    },
    {
      key: 'messages',
      title: 'Mensajes sin leer',
      value: String(conversationsTotal),
      sub: 'Conversaciones recientes en WhatsApp',
      accent: 'from-fuchsia-400 to-purple-400'
    }
  ];

  const maxPayment = Math.max(...(stats.salesByPaymentMethod?.map(i => i.usdCents) ?? [1]));

  const catalogSlug = businessSettings?.slug;
  const catalogUrl = catalogSlug ? `ventasve.app/c/${catalogSlug}` : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-zinc-50">Dashboard</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Órdenes y actividad de tu tienda.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/80 p-1 text-[11px]">
          {[
            { key: 'day', label: 'Hoy' },
            { key: 'week', label: 'Semana' },
            { key: 'month', label: 'Mes' }
          ].map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPeriod(option.key as 'day' | 'week' | 'month')}
              className={
                period === option.key
                  ? 'rounded-full bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-900'
                  : 'rounded-full px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100'
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map(card => (
          <div
            key={card.key}
            className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-[0_0_25px_rgba(0,0,0,0.6)]"
          >
            <div
              className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${card.accent}`}
            />
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {card.title}
            </div>
            <div className="mt-2 font-sans text-2xl font-bold text-zinc-50">
              {card.value}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400">Pedidos Recientes</h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500">#{order.orderNumber ?? '—'}</span>
                  <span className="text-sm text-zinc-200">
                    {order.customer?.name || 'Cliente'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
                    {order.status}
                  </span>
                  <span className="text-sm font-medium text-zinc-100">
                    {formatUsd(order.totalCents)}
                  </span>
                </div>
              </div>
            ))}
            {!recentOrders.length && (
              <div className="py-6 text-center text-xs text-zinc-500">
                No hay pedidos recientes.
              </div>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Métodos de Pago</h2>
          <div className="space-y-3">
            {(stats.salesByPaymentMethod ?? []).map(item => {
              const pct = Math.max(4, (item.usdCents / maxPayment) * 100);
              return (
                <div key={item.paymentMethod} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">{item.paymentMethod}</span>
                    <span className="text-zinc-400">{formatUsd(item.usdCents)}</span>
                  </div>
                  <div className="h-2 w-full rounded bg-zinc-800">
                    <div
                      className="h-2 rounded bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!stats.salesByPaymentMethod || stats.salesByPaymentMethod.length === 0) && (
              <div className="py-6 text-center text-xs text-zinc-500">
                Aún no hay ventas por método de pago.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div className="text-sm font-medium text-zinc-200">
              Inbox Unificado
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                WA
              </span>
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                IG
              </span>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                WEB
              </span>
            </div>
          </div>
          <div className="divide-y divide-zinc-800 px-2 py-2">
            {recentConversations.map(conversation => {
              const lastMessage = conversation.messages?.[0];
              const customerName = conversation.customer?.name || 'Cliente WhatsApp';
              const statusLabel =
                conversation.status === 'BOT'
                  ? 'Bot'
                  : conversation.status === 'HUMAN'
                    ? 'Humano'
                    : conversation.status === 'CLOSED'
                      ? 'Cerrada'
                      : conversation.status;
              return (
                <div
                  key={conversation.id}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 hover:bg-zinc-900/80"
                  onClick={() => router.push(`/dashboard/inbox/${conversation.id}`)}
                >
                  <div className="flex flex-1 flex-col">
                    <div className="text-sm font-medium text-zinc-100">
                      {customerName}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {lastMessage ? lastMessage.content : 'Sin mensajes'}
                    </div>
                  </div>
                  <span className="ml-3 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                    {statusLabel}
                  </span>
                </div>
              );
            })}
            {!recentConversations.length && (
              <div className="py-6 text-center text-xs text-zinc-500">
                Aún no tienes conversaciones de WhatsApp.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/70">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div className="text-sm font-medium text-zinc-200">
                ChatBot IA · WhatsApp
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                ACTIVO
              </span>
            </div>
            <div className="px-4 py-3">
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <div className="text-[12px] font-medium text-emerald-200">
                  Bot respondiendo automáticamente
                </div>
                <div className="ml-auto text-[11px] text-zinc-400">
                  API Oficial Meta
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-lg bg-zinc-900/80 px-2 py-3">
                  <div className="text-lg font-semibold text-amber-300">
                    0
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-500">
                    Respuestas hoy
                  </div>
                </div>
                <div className="rounded-lg bg-zinc-900/80 px-2 py-3">
                  <div className="text-lg font-semibold text-emerald-300">
                    0
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-500">
                    Pedidos tomados
                  </div>
                </div>
                <div className="rounded-lg bg-zinc-900/80 px-2 py-3">
                  <div className="text-lg font-semibold text-blue-300">
                    0%
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-500">
                    Resueltos sin humano
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/70">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div className="text-sm font-medium text-zinc-200">
                Catálogo Online
              </div>
              <button
                type="button"
                onClick={() => router.push('/dashboard/settings')}
                className="text-[11px] font-medium text-amber-400 hover:text-amber-300"
              >
                Editar →
              </button>
            </div>
            <div className="px-4 py-3">
              <div className="rounded-lg bg-zinc-900/80 px-3 py-3 text-xs text-zinc-400">
                Configura tu catálogo en la sección de Configuración para ver aquí
                una vista previa rápida de tus productos.
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/20 text-lg">
                  📲
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-medium text-emerald-300">
                    Compartir catálogo por WhatsApp
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {catalogUrl || 'Configura el slug de tu negocio para generar el enlace.'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!catalogUrl}
                  onClick={() => catalogUrl && navigator.clipboard.writeText(catalogUrl)}
                  className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/70">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="text-sm font-medium text-zinc-200">
            Conciliación de Pagos — Pendientes
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span>{pendingPayments} por confirmar</span>
          </div>
        </div>
        <div className="grid gap-3 px-4 py-3 md:grid-cols-3">
          {pendingPaymentsList.map(payment => {
            const customerName = payment.order?.customer?.name || 'Cliente';
            const method = payment.method;
            const amount = formatPaymentAmount(payment);
            return (
              <div
                key={payment.id}
                className="flex items-center gap-3 rounded-lg bg-zinc-900/80 px-3 py-3"
              >
                <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-zinc-200">
                    {method} · {customerName}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Pedido #{payment.order?.orderNumber ?? payment.orderId}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-zinc-50">
                    {amount}
                  </div>
                  <div className="mt-1 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Pendiente
                  </div>
                </div>
              </div>
            );
          })}
          {!pendingPaymentsList.length && (
            <div className="col-span-3 py-6 text-center text-xs text-zinc-500">
              No tienes pagos pendientes por conciliar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
