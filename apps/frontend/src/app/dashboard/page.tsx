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
      accent: 'bg-[#f5c842]'
    },
    {
      key: 'orders',
      title: 'Pedidos activos',
      value: String(activeOrders),
      sub: 'Pendientes, confirmados y en preparación',
      accent: 'bg-[#1a9e5c]'
    },
    {
      key: 'payments',
      title: 'Pagos pendientes',
      value: String(pendingPayments),
      sub: 'Pagos por verificar',
      accent: 'bg-[#e8360e]'
    },
    {
      key: 'messages',
      title: 'Mensajes sin leer',
      value: String(conversationsTotal),
      sub: 'Conversaciones recientes en WhatsApp',
      accent: 'bg-zinc-600'
    }
  ];

  const maxPayment = Math.max(...(stats.salesByPaymentMethod?.map(i => i.usdCents) ?? [1]));

  const catalogSlug = businessSettings?.slug;
  const catalogUrl = catalogSlug ? `ventasve.app/c/${catalogSlug}` : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-[var(--foreground)]">Dashboard</h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Órdenes y actividad de tu tienda en tiempo real.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 text-[11px] shadow-lg">
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
                  ? 'rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-bold text-zinc-50 shadow-sm'
                  : 'rounded-lg px-4 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors'
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
            className="card-elevated relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl backdrop-blur-md"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 ${card.accent}`}
            />
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              {card.title}
            </div>
            <div className="mt-3 font-heading text-3xl font-bold text-[var(--foreground)]">
              {card.value}
            </div>
            <div className="mt-1.5 text-[11px] font-medium text-[var(--muted)]">
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="card-elevated rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <span className="text-lg">📦</span> Pedidos Recientes
            </h2>
            <button className="text-[11px] font-bold text-[var(--accent-secondary)] uppercase tracking-tight">Ver todos →</button>
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
        <div className="card-elevated rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span className="text-lg">💳</span> Métodos de Pago
            </h2>
            <button className="text-[11px] font-bold text-zinc-500 uppercase tracking-tight">Conciliar</button>
          </div>
          <div className="space-y-5">
            {(stats.salesByPaymentMethod ?? []).map(item => {
              const pct = Math.max(4, (item.usdCents / maxPayment) * 100);
              const barColors: Record<string, string> = {
                'Zelle': 'bg-purple-500',
                'Pago móvil': 'bg-blue-500',
                'Binance Pay': 'bg-yellow-500',
                'Efectivo USD': 'bg-emerald-500',
                'Transferencia Bs': 'bg-red-500'
              };
              const color = barColors[item.paymentMethod] || 'bg-zinc-500';
              return (
                <div key={item.paymentMethod} className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-zinc-100">{item.paymentMethod}</span>
                    <span className="font-bold text-zinc-400">{formatUsd(item.usdCents)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800">
                    <div
                      className={`h-1.5 rounded-full ${color} shadow-[0_0_8px_rgba(0,0,0,0.4)]`}
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
        <div className="card-elevated rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <h2 className="font-heading text-sm font-bold text-zinc-100 flex items-center gap-2">
               <span className="text-lg">💬</span> Inbox Unificado
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-500 border border-emerald-500/20">
                WA
              </span>
              <span className="rounded-lg bg-red-500/10 px-2 py-1 text-[9px] font-bold text-red-500 border border-red-500/20">
                IG
              </span>
              <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-[9px] font-bold text-blue-500 border border-blue-500/20">
                WEB
              </span>
            </div>
          </div>
          <div className="divide-y divide-zinc-800 px-3 py-3">
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
                  className="flex cursor-pointer items-center justify-between rounded-xl p-3 transition-colors hover:bg-zinc-800/40 group"
                  onClick={() => router.push(`/dashboard/inbox/${conversation.id}`)}
                >
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-zinc-400 group-hover:bg-zinc-700 transition-colors">
                      {customerName.charAt(0)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="text-sm font-bold text-zinc-100 truncate">
                        {customerName}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {lastMessage ? lastMessage.content : 'Sin mensajes'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 ml-3">
                     <span className="text-[10px] text-zinc-500 font-medium">10:32</span>
                    <span className={`rounded-lg px-2 py-0.5 text-[9px] font-bold ${conversation.status === 'BOT' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                      {statusLabel}
                    </span>
                  </div>
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

        <div className="flex flex-col gap-6">
          <div className="card-elevated overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-900/60 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="font-heading text-sm font-bold text-zinc-100 flex items-center gap-2">
                 <span className="text-lg">🤖</span> ChatBot IA · WhatsApp
              </h2>
              <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-500 border border-emerald-500/20">
                ACTIVO
              </span>
            </div>
            <div className="p-6">
              <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <div className="text-[11px] font-bold text-emerald-200 uppercase tracking-tight">
                  Bot respondiendo automáticamente
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-zinc-950/40 border border-zinc-800 p-4 text-center">
                  <div className="font-heading text-xl font-bold text-[var(--accent-secondary)]">
                    43
                  </div>
                  <div className="mt-1 text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">
                    Respuestas hoy
                  </div>
                </div>
                <div className="rounded-2xl bg-zinc-950/40 border border-zinc-800 p-4 text-center">
                  <div className="font-heading text-xl font-bold text-emerald-400">
                    8
                  </div>
                  <div className="mt-1 text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">
                    Pedidos tomados
                  </div>
                </div>
                <div className="rounded-2xl bg-zinc-950/40 border border-zinc-800 p-4 text-center">
                  <div className="font-heading text-xl font-bold text-sky-400">
                    92%
                  </div>
                  <div className="mt-1 text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">
                    Resueltos IA
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-elevated overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-900/60 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="font-heading text-sm font-bold text-zinc-100 flex items-center gap-2">
                 <span className="text-lg">🛍️</span> Catálogo Online
              </h2>
              <button
                type="button"
                onClick={() => router.push('/dashboard/settings')}
                className="text-[11px] font-bold text-[var(--accent-secondary)] uppercase tracking-tight"
              >
                Editar →
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="aspect-square rounded-xl bg-zinc-800/50 flex items-center justify-center text-xl">👕</div>
                  <div className="aspect-square rounded-xl bg-zinc-800/50 flex items-center justify-center text-xl">👟</div>
                  <div className="aspect-square rounded-xl bg-zinc-800/50 flex items-center justify-center text-xl">👜</div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 group cursor-pointer" onClick={() => catalogUrl && navigator.clipboard.writeText(catalogUrl)}>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-lg">
                  📲
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-tight">
                    Compartir catálogo
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5 font-medium">
                    {catalogUrl || 'Configura el slug de tu negocio'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!catalogUrl}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[10px] font-bold text-zinc-950 shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-elevated overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-900/60 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="font-heading text-sm font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-lg">🔄</span> Conciliación de Pagos
          </h2>
          <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-tight">
            <span>{pendingPayments} PENDIENTES</span>
          </div>
        </div>
        <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
          {pendingPaymentsList.map(payment => {
            const customerName = payment.order?.customer?.name || 'Cliente';
            const method = payment.method;
            const amount = formatPaymentAmount(payment);
            const methodColors: Record<string, string> = {
                'Zelle': 'bg-purple-500',
                'Pago móvil': 'bg-blue-500',
                'Binance Pay': 'bg-yellow-500',
                'Efectivo USD': 'bg-emerald-500',
                'Transferencia Bs': 'bg-red-500'
            };
            const color = methodColors[method] || 'bg-zinc-500';
            return (
              <div
                key={payment.id}
                className="flex items-center gap-4 rounded-2xl bg-zinc-950/40 border border-zinc-800 p-4 transition-all hover:border-zinc-700"
              >
                <div className={`h-2 w-2 flex-shrink-0 rounded-full ${color} shadow-[0_0_8px_rgba(0,0,0,0.4)]`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-100 truncate">
                    {method} · {customerName}
                  </div>
                  <div className="text-[10px] font-medium text-zinc-500 mt-0.5">
                    Pedido #{payment.order?.orderNumber ?? payment.orderId}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-heading text-sm font-bold text-zinc-100">
                    {amount}
                  </div>
                  <div className="mt-1 text-[9px] font-bold text-orange-500 uppercase">
                    CONFIRMAR
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
