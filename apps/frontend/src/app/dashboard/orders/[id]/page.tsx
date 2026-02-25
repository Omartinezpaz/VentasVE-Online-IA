'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ordersApi, OrderDetail } from '@/lib/api/orders';
import { paymentsApi } from '@/lib/api/payments';
import { getAccessToken } from '@/lib/auth/storage';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import {
  deliveryApi,
  type DeliveryPersonSummary,
  type DeliveryOrderStatus
} from '@/lib/api/delivery';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const formatCurrency = (cents: number) => (cents / 100).toFixed(2);

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const statusLabel: Record<string, string> = {
  PENDING:   'Pendiente',
  CONFIRMED: 'Confirmada',
  PREPARING: 'Preparando',
  SHIPPED:   'Enviada',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

const statusColor: Record<string, string> = {
  PENDING:   'bg-[var(--background)] text-[var(--muted)] border border-[var(--border)]',
  CONFIRMED: 'bg-amber-400/10 text-amber-300 border border-amber-400/40',
  PREPARING: 'bg-blue-400/10 text-blue-300 border border-blue-400/40',
  SHIPPED:   'bg-purple-400/10 text-purple-300 border border-purple-400/40',
  DELIVERED: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/40',
  CANCELLED: 'bg-red-400/10 text-red-300 border border-red-400/40',
};

const statusIcon: Record<string, string> = {
  PENDING:   '⏳',
  CONFIRMED: '✅',
  PREPARING: '🧵',
  SHIPPED:   '📦',
  DELIVERED: '🏁',
  CANCELLED: '✗',
};

const paymentStatusStyle: Record<string, string> = {
  VERIFIED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-400 border border-red-500/30',
  PENDING:  'bg-amber-500/15 text-amber-400 border border-amber-500/30',
};

const paymentStatusLabel: Record<string, string> = {
  VERIFIED: 'Verificado',
  REJECTED: 'Rechazado',
  PENDING:  'Pendiente',
};

const deliveryStatusLabel: Record<string, string> = {
  ASSIGNED: 'Asignado',
  PICKED_UP: 'En camino',
  IN_TRANSIT: 'En camino',
  DELIVERED: 'Entregado',
  FAILED: 'Fallida'
};

const deliveryStatusColor: Record<string, string> = {
  ASSIGNED: 'bg-amber-400/10 text-amber-300 border border-amber-400/40',
  PICKED_UP: 'bg-blue-400/10 text-blue-300 border border-blue-400/40',
  IN_TRANSIT: 'bg-blue-400/10 text-blue-300 border border-blue-400/40',
  DELIVERED: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/40',
  FAILED: 'bg-red-400/10 text-red-300 border border-red-400/40'
};

const statusOptions = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-[var(--muted)] shrink-0">{label}</span>
      <span className="text-[var(--foreground)] text-right">{value}</span>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder]               = useState<OrderDetail | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [updating, setUpdating]         = useState(false);
  const [statusMsg, setStatusMsg]       = useState<{ text: string; ok: boolean } | null>(null);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentImageUrl, setPaymentImageUrl] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentMsg, setPaymentMsg]     = useState<{ text: string; ok: boolean } | null>(null);
  const [verifyingId, setVerifyingId]   = useState<string | null>(null);
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPersonSummary[]>([]);
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState('');
  const [assigningDelivery, setAssigningDelivery] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [assignedDelivery, setAssignedDelivery] = useState<{ name: string; phone: string | null } | null>(null);
  const [deliveryOrder, setDeliveryOrder] = useState<DeliveryOrderStatus | null>(null);
  const [showDeliveryDetails, setShowDeliveryDetails] = useState(false);

  // ─── LOAD ORDER ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace('/auth/login'); return; }

    if (!id || id === 'undefined') {
      setError('Orden no encontrada');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const response = await ordersApi.getById(id);
        setOrder(response.data);
      } catch {
        setError('No se pudo cargar la orden');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router, id]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !id || id === 'undefined') {
      return;
    }
    const loadDeliveryOrder = async () => {
      try {
        const response = await deliveryApi.getOrder(id);
        setDeliveryOrder(response.data.deliveryOrder);
      } catch {
      }
    };
    loadDeliveryOrder();
  }, [id]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }
    const loadPersons = async () => {
      try {
        const response = await deliveryApi.listPersons();
        setDeliveryPersons(response.data.persons);
      } catch {
      }
    };
    loadPersons();
  }, []);

  // ─── STATUS CHANGE ──────────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: string) => {
    if (!order || newStatus === order.status) return;
    setUpdating(true);
    setStatusMsg(null);
    try {
      const response = await ordersApi.updateStatus(order.id, newStatus);
      setOrder(response.data);
      setStatusMsg({ text: '✓ Estado actualizado', ok: true });
    } catch {
      setStatusMsg({ text: '✗ No se pudo actualizar el estado', ok: false });
    } finally {
      setUpdating(false);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  // ─── REGISTER PAYMENT ───────────────────────────────────────────────────────
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!paymentImageUrl && !paymentReference) {
      setPaymentMsg({ text: 'Ingresa al menos URL de comprobante o referencia', ok: false });
      return;
    }
    setCreatingPayment(true);
    setPaymentMsg(null);
    try {
      const created = await paymentsApi.create({
        orderId: order.id,
        method: order.paymentMethod || 'TRANSFER_BS',
        imageUrl: paymentImageUrl || undefined,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      });
      setOrder(prev =>
        prev ? { ...prev, payments: [created.data, ...(prev.payments ?? [])] } : prev
      );
      setPaymentImageUrl('');
      setPaymentReference('');
      setPaymentNotes('');
      setPaymentMsg({ text: '✓ Pago registrado correctamente', ok: true });
    } catch {
      setPaymentMsg({ text: '✗ No se pudo registrar el pago', ok: false });
    } finally {
      setCreatingPayment(false);
      setTimeout(() => setPaymentMsg(null), 4000);
    }
  };

  const handleAssignDelivery = async () => {
    if (!order || !selectedDeliveryPersonId) return;
    setAssigningDelivery(true);
    setAssignMsg(null);
    try {
      const response = await deliveryApi.assign(order.id, selectedDeliveryPersonId);
      const deliveryPerson = response.data.deliveryPerson as
        | { id?: string; name?: string; phone?: string | null }
        | undefined;
      if (deliveryPerson && deliveryPerson.name) {
        setAssignedDelivery({
          name: deliveryPerson.name,
          phone: deliveryPerson.phone ?? null
        });
      }
      setAssignMsg({ text: '✓ Repartidor asignado', ok: true });
      try {
        const refreshed = await deliveryApi.getOrder(order.id);
        setDeliveryOrder(refreshed.data.deliveryOrder);
      } catch {
      }
    } catch {
      setAssignMsg({ text: '✗ No se pudo asignar la entrega', ok: false });
    } finally {
      setAssigningDelivery(false);
      setTimeout(() => setAssignMsg(null), 4000);
    }
  };

  // ─── VERIFY / REJECT PAYMENT ────────────────────────────────────────────────
  const handleVerifyPayment = async (paymentId: string, status: 'VERIFIED' | 'REJECTED') => {
    setVerifyingId(paymentId);
    try {
      const response = await paymentsApi.verify(paymentId, status);
      setOrder(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          payments: (prev.payments ?? []).map(p => (p.id === paymentId ? response.data : p)),
        };
      });
      // Si se verificó, refrescar la orden completa (el backend puede cambiar el status)
      if (status === 'VERIFIED') {
        const refreshed = await ordersApi.getById(id);
        setOrder(refreshed.data);
      }
    } catch {
      setStatusMsg({ text: '✗ No se pudo actualizar el pago', ok: false });
      setTimeout(() => setStatusMsg(null), 3000);
    } finally {
      setVerifyingId(null);
    }
  };

  // ─── LOADING STATE ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-[var(--surface2)]" />
        <div className="grid gap-4 md:grid-cols-[2fr,3fr]">
          <div className="space-y-4">
            <div className="h-28 rounded-xl bg-[var(--surface2)]" />
            <div className="h-24 rounded-xl bg-[var(--surface2)]" />
          </div>
          <div className="h-48 rounded-xl bg-[var(--surface2)]" />
        </div>
      </div>
    );
  }

  // ─── ERROR STATE ────────────────────────────────────────────────────────────
  if (error || !order) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
        <span>⚠</span>
        {error || 'Orden no encontrada'}
      </div>
    );
  }

  const orderTitle = order.orderNumber ? `Orden #${order.orderNumber}` : `Orden ${order.id.slice(0, 8).toUpperCase()}`;
  const totalUsd = formatCurrency(order.totalCents);
  const totalBs = order.exchangeRate
    ? (order.totalCents / 100 * order.exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })
    : null;

  const shippingCents = typeof order.shippingCostCents === 'number' ? order.shippingCostCents : 0;
  const subtotalCents = Math.max(order.totalCents - shippingCents, 0);
  const itemsCostCents = (order.items ?? []).reduce((acc, item) => {
    const unitCost = item.product?.costCents ?? 0;
    return acc + unitCost * item.quantity;
  }, 0);
  const hasCost = itemsCostCents > 0;
  const marginCents = hasCost ? order.totalCents - itemsCostCents : 0;
  const marginUsd = hasCost ? formatCurrency(marginCents) : null;
  const marginPercent = hasCost && itemsCostCents > 0 ? (marginCents / itemsCostCents) * 100 : null;
  const deliveryAverageRating =
    deliveryOrder?.deliveryPerson?.averageRating != null
      ? deliveryOrder.deliveryPerson.averageRating
      : null;
  const deliveryRatingsCount = deliveryOrder?.deliveryPerson?.ratingsCount ?? 0;
  const deliverySingleRating = deliveryOrder?.rating ?? null;

  return (
    <div className="space-y-5">
      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-bold text-[var(--foreground)]">{orderTitle}</h1>
            <span
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                statusColor[order.status] ??
                'bg-[var(--background)] text-[var(--muted)] border border-[var(--border)]'
              }`}
            >
              {statusLabel[order.status] ?? order.status}
            </span>
            {deliveryOrder && (
              <button
                type="button"
                onClick={() => setShowDeliveryDetails(prev => !prev)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                  deliveryStatusColor[deliveryOrder.status] ??
                  'bg-[var(--background)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                {deliveryStatusLabel[deliveryOrder.status] ?? deliveryOrder.status}
                {deliveryOrder.deliveredAt &&
                  ` · ${formatDateTime(deliveryOrder.deliveredAt)}`}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Creada el {formatDateTime(order.createdAt)}
          </p>
        </div>

        {/* Status selector + resumen lateral */}
        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="flex flex-col items-start gap-1 text-xs text-[var(--muted)] md:items-end">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                ${totalUsd}
              </span>
              {totalBs && (
                <span className="text-[11px] text-[var(--muted)]">
                  ≈ Bs. {totalBs}
                </span>
              )}
            </div>
            <div>
              Pago:{' '}
              <span className="font-medium text-[var(--foreground)]">
                {order.paymentMethod || 'No definido'}
              </span>
            </div>
            {(order.shippingZoneSlug || order.shippingMethodCode) && (
              <div>
                Envío:{' '}
                <span className="font-medium text-[var(--foreground)]">
                  {order.shippingMethodCode || 'Sin método'}
                  {order.shippingZoneSlug ? ` · ${order.shippingZoneSlug}` : ''}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[var(--muted)]">Cambiar estado:</label>
            <select
              value={order.status}
              onChange={e => handleStatusChange(e.target.value)}
              disabled={updating}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] disabled:opacity-60"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{statusLabel[s]}</option>
              ))}
            </select>
            {updating && (
              <svg className="h-3.5 w-3.5 animate-spin text-[var(--muted)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
          </div>
          {statusMsg && (
            <p className={`text-[11px] font-medium ${statusMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {statusMsg.text}
            </p>
          )}
        </div>
      </div>

      {/* ─── STATUS TIMELINE ─────────────────────────────────────────────────── */}
      <OrderTimeline
        currentStatus={order.status}
        steps={statusOptions.map(key => ({
          key,
          label: statusLabel[key],
          icon: statusIcon[key],
        }))}
      />

      {/* ─── MAIN GRID ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-[2fr,3fr]">

        {/* LEFT: Cliente + Pago + Notas */}
        <div className="space-y-4">
          <SectionCard title="Cliente">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {order.customer?.name || 'Cliente sin nombre'}
              </p>
              <InfoRow label="Teléfono" value={order.customer?.phone} />
              {order.deliveryAddress && (
                <div className="mt-2 rounded-lg bg-[var(--background)]/60 px-3 py-2 text-xs text-[var(--muted)]">
                  📍 {order.deliveryAddress}
                </div>
              )}
              {(order.shippingZoneSlug || order.shippingMethodCode) && (
                <div className="mt-2 rounded-lg bg-[var(--background)]/40 px-3 py-2 text-[11px] text-[var(--muted)] space-y-0.5">
                  <div className="font-semibold text-[var(--foreground)]">
                    Envío{order.shippingZoneSlug ? ` · ${order.shippingZoneSlug}` : ''}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {order.shippingMethodCode || 'Método no especificado'}
                    </span>
                    {typeof order.shippingCostCents === 'number' && (
                      <span className="inline-flex items-center rounded-full bg-[var(--surface2)] px-2 py-0.5 text-[10px] font-bold">
                        {order.shippingCostCents === 0
                          ? 'Gratis'
                          : `$${formatCurrency(order.shippingCostCents)}`}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-3 space-y-1 rounded-lg bg-[var(--background)]/40 px-3 py-2 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--foreground)]">
                          Repartidor
                        </span>
                        {(deliveryOrder?.deliveryPerson || assignedDelivery) && (
                          <span className="text-[11px] text-[var(--muted)]">
                            Asignado a{' '}
                            {deliveryOrder?.deliveryPerson?.name ??
                              assignedDelivery?.name}
                            {deliveryOrder?.deliveryPerson?.phone ||
                            assignedDelivery?.phone
                              ? ` · ${
                                  deliveryOrder?.deliveryPerson?.phone ??
                                  assignedDelivery?.phone
                                }`
                              : ''}
                          </span>
                        )}
                      </div>
                      {deliveryAverageRating != null && deliveryRatingsCount > 0 && (
                        <div className="mt-1 text-[11px] text-[var(--muted)]">
                          Rating promedio repartidor:{' '}
                          <span className="font-semibold text-amber-300">
                            {deliveryAverageRating.toFixed(1)} ★
                          </span>{' '}
                          <span className="text-[10px]">
                            ({deliveryRatingsCount} opiniones)
                          </span>
                        </div>
                    )}
                {showDeliveryDetails && deliveryOrder && (
                  <div className="mt-2 space-y-1 rounded-lg bg-[var(--surface)]/60 px-3 py-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[var(--muted)]">Estado</span>
                      <span className="text-[var(--foreground)]">
                        {deliveryStatusLabel[deliveryOrder.status] ??
                          deliveryOrder.status}
                      </span>
                    </div>
                    {deliveryOrder.pickedUpAt && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--muted)]">Recogido</span>
                        <span className="text-[var(--foreground)]">
                          {formatDateTime(deliveryOrder.pickedUpAt)}
                        </span>
                      </div>
                    )}
                    {deliveryOrder.deliveredAt && (
                      <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--muted)]">Entregado</span>
                    <span className="text-[var(--foreground)]">
                      {formatDateTime(deliveryOrder.deliveredAt)}
                    </span>
                      </div>
                    )}
                    {deliveryOrder.failedAt && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--muted)]">Fallida</span>
                        <span className="text-[var(--foreground)]">
                          {formatDateTime(deliveryOrder.failedAt)}
                        </span>
                      </div>
                    )}
                    {deliveryOrder.failureReason && (
                      <div className="mt-1 text-[11px] text-[var(--muted)]">
                        Motivo: {deliveryOrder.failureReason}
                      </div>
                    )}
                    {deliveryOrder.otpCode && (
                      <div className="mt-1 text-[11px] text-[var(--muted)]">
                        OTP: {deliveryOrder.otpCode}
                      </div>
                    )}
                    {deliverySingleRating && (
                      <div className="mt-2 space-y-1 rounded-lg bg-[var(--background)]/40 px-3 py-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[var(--muted)]">Calificación de esta entrega</span>
                          <span className="font-semibold text-amber-300">
                            {deliverySingleRating.rating.toFixed(1)} ★
                          </span>
                        </div>
                        {deliverySingleRating.comment && (
                          <p className="mt-1 text-[11px] text-[var(--muted)]">
                            “{deliverySingleRating.comment}”
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {deliveryPersons.length === 0 ? (
                  <p className="mt-2 text-[11px] text-[var(--muted)]">
                    No hay repartidores activos configurados todavía.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    <select
                      value={selectedDeliveryPersonId}
                      onChange={e => setSelectedDeliveryPersonId(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">Selecciona un repartidor</option>
                      {deliveryPersons.map(person => (
                        <option key={person.id} value={person.id}>
                          {person.name} {person.isAvailable ? '' : '(no disponible)'}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between gap-2">
                      {assignMsg && (
                        <span
                          className={`text-[11px] ${
                            assignMsg.ok ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {assignMsg.text}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleAssignDelivery}
                        disabled={
                          assigningDelivery ||
                          !selectedDeliveryPersonId ||
                          !order.shippingMethodCode
                        }
                        className="ml-auto inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-60"
                      >
                        {assigningDelivery ? 'Asignando...' : 'Asignar entrega'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Resumen financiero">
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--foreground)]">${totalUsd}</span>
                {totalBs && (
                  <span className="text-sm text-[var(--muted)]">≈ Bs. {totalBs}</span>
                )}
              </div>
              <InfoRow label="Subtotal" value={`$${formatCurrency(subtotalCents)}`} />
              {typeof order.shippingCostCents === 'number' && (
                <InfoRow
                  label="Envío"
                  value={
                    order.shippingCostCents === 0
                      ? 'Gratis'
                      : `$${formatCurrency(order.shippingCostCents)}`
                  }
                />
              )}
              <InfoRow label="Total USD" value={`$${totalUsd}`} />
              {totalBs && (
                <InfoRow label="Total Bs" value={`Bs. ${totalBs}`} />
              )}
              <InfoRow label="Método de pago" value={order.paymentMethod} />
              {order.exchangeRate && (
                <InfoRow label="Tasa BCV" value={`${order.exchangeRate} Bs./USD`} />
              )}
              {hasCost && (
                <>
                  <InfoRow label="Costo estimado" value={`$${formatCurrency(itemsCostCents)} aproximadamente`} />
                  {marginUsd && (
                    <InfoRow
                      label="Margen estimado"
                      value={
                        marginPercent != null
                          ? `$${marginUsd} (${marginPercent.toFixed(1)}%)`
                          : `$${marginUsd}`
                      }
                    />
                  )}
                </>
              )}
            </div>
          </SectionCard>

          {order.notes && (
            <SectionCard title="Notas del cliente">
              <p className="text-xs text-zinc-300 leading-relaxed">{order.notes}</p>
            </SectionCard>
          )}
        </div>

        {/* RIGHT: Productos */}
        <SectionCard title={`Productos (${order.items?.length ?? 0})`}>
          {!order.items?.length ? (
            <p className="text-xs text-[var(--muted)]">Esta orden no tiene productos registrados.</p>
          ) : (
            <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] overflow-hidden">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-[var(--background)]/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--foreground)] truncate">
                      {item.product?.name || 'Producto sin nombre'}
                    </p>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">
                      {item.quantity} × ${formatCurrency(item.unitPriceCents)}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-[var(--foreground)] shrink-0 ml-4">
                    ${formatCurrency(item.unitPriceCents * item.quantity)}
                  </p>
                </div>
              ))}
              {/* Total row */}
              <div className="flex justify-between px-3 py-2.5 bg-[var(--background)]/60">
                <span className="text-xs font-bold text-[var(--foreground)]">Total</span>
                <span className="text-xs font-bold text-[#f5c842]">${totalUsd}</span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ─── PAYMENTS SECTION ────────────────────────────────────────────────── */}
      <SectionCard title="Comprobantes de pago">
        {/* Register payment form */}
        <form onSubmit={handleCreatePayment} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-4">
          <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Registrar nuevo pago</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-[11px] text-[var(--muted)]">Comprobante (URL)</label>
              <input
                value={paymentImageUrl}
                onChange={e => setPaymentImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-[var(--muted)]">Referencia</label>
              <input
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                placeholder="Número de referencia"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-[var(--muted)]">Notas</label>
              <input
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            {paymentMsg ? (
              <p className={`text-[11px] font-medium ${paymentMsg.ok ? 'text-emerald-500' : 'text-red-500'}`}>
                {paymentMsg.text}
              </p>
            ) : <span />}
            <button
              type="submit"
              disabled={creatingPayment}
              className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-zinc-950 transition hover:bg-emerald-400 active:scale-95 disabled:opacity-60 flex items-center gap-2"
            >
              {creatingPayment && (
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              {creatingPayment ? 'Registrando...' : 'Registrar pago'}
            </button>
          </div>
        </form>

        {/* Payment list */}
        {!order.payments?.length ? (
          <p className="text-xs text-[var(--muted)] px-1">No hay pagos registrados para esta orden.</p>
        ) : (
          <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden">
            {order.payments.map(payment => (
              <div key={payment.id} className="flex items-start justify-between px-4 py-3 gap-4 hover:bg-[var(--background)]/40 transition-colors">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[var(--foreground)]">
                      ${formatCurrency(payment.amountCents)}
                    </span>
                    <span className="rounded-md bg-[var(--surface2)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                      {payment.method}
                    </span>
                    {/* BUG FIX: este badge tenía template string dentro de className — ahora correcto */}
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${paymentStatusStyle[payment.status] ?? 'bg-[var(--surface2)] text-[var(--muted)]'}`}>
                      {paymentStatusLabel[payment.status] ?? payment.status}
                    </span>
                  </div>
                  {payment.reference && (
                    <p className="text-[11px] text-[var(--muted)]">Ref: {payment.reference}</p>
                  )}
                  {payment.imageUrl && (
                    <a
                      href={payment.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-400 underline transition-colors"
                    >
                      🖼 Ver comprobante
                    </a>
                  )}
                  <p className="text-[10px] text-zinc-600">{formatDateTime(payment.createdAt)}</p>
                </div>

                {/* Actions — solo si está PENDING */}
                {payment.status === 'PENDING' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleVerifyPayment(payment.id, 'VERIFIED')}
                      disabled={verifyingId === payment.id}
                      className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/25 transition active:scale-95 disabled:opacity-50"
                    >
                      {verifyingId === payment.id ? '...' : '✓ Verificar'}
                    </button>
                    <button
                      onClick={() => handleVerifyPayment(payment.id, 'REJECTED')}
                      disabled={verifyingId === payment.id}
                      className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/20 transition active:scale-95 disabled:opacity-50"
                    >
                      ✗ Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
