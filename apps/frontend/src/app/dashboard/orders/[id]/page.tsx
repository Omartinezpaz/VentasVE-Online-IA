'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ordersApi, OrderDetail } from '@/lib/api/orders';
import { paymentsApi } from '@/lib/api/payments';
import { getAccessToken } from '@/lib/auth/storage';

const formatCurrency = (cents: number) => {
  return (cents / 100).toFixed(2);
};

const formatDateTime = (value: string) => {
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

const statusOptions = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED'
] as const;

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentImageUrl, setPaymentImageUrl] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
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

  const handleStatusChange = async (newStatus: string) => {
    if (!order || newStatus === order.status) {
      return;
    }

    setUpdating(true);
    setUpdateMessage(null);

    try {
      const response = await ordersApi.updateStatus(order.id, newStatus);
      setOrder(response.data);
      setUpdateMessage('Estado de la orden actualizado');
    } catch {
      setUpdateMessage('No se pudo actualizar el estado');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!paymentImageUrl && !paymentReference) {
      setPaymentMessage('Ingresa al menos URL de comprobante o referencia');
      return;
    }
    setCreatingPayment(true);
    setPaymentMessage(null);
    try {
      const created = await paymentsApi.create({
        orderId: order.id,
        method: order.paymentMethod || 'TRANSFER_BS',
        imageUrl: paymentImageUrl || undefined,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined
      });
      setOrder(prev =>
        prev
          ? { ...prev, payments: [created.data, ...(prev.payments ?? [])] }
          : prev
      );
      setPaymentImageUrl('');
      setPaymentReference('');
      setPaymentNotes('');
      setPaymentMessage('Pago registrado');
    } catch {
      setPaymentMessage('No se pudo registrar el pago');
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const response = await paymentsApi.verify(paymentId, status);
      setOrder(prev => {
        if (!prev) return prev;
        const nextPayments = (prev.payments || []).map(p => (p.id === paymentId ? response.data : p));
        return { ...prev, payments: nextPayments };
      });
      if (status === 'VERIFIED') {
        // La orden puede pasar a CONFIRMED por backend; refrescamos
        const refreshed = await ordersApi.getById(order!.id);
        setOrder(refreshed.data);
      }
    } catch {
      // Mensaje simple; UI mínima
      setUpdateMessage('No se pudo actualizar el pago');
    }
  };

  if (loading) {
    return (
      <div className="py-6 text-sm text-zinc-400">
        Cargando orden...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
        {error || 'Orden no encontrada'}
      </div>
    );
  }

  const orderTitle = order.orderNumber ? `Orden #${order.orderNumber}` : `Orden ${order.id.slice(0, 8)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">
            {orderTitle}
          </h1>
          <p className="text-xs text-zinc-500">
            Creada el {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">
              Estado
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                statusColor[order.status] || 'bg-zinc-800 text-zinc-200'
              }`}
            >
              {statusLabel[order.status] || order.status}
            </span>
          </div>
          <div>
            <select
              value={order.status}
              onChange={event => handleStatusChange(event.target.value)}
              disabled={updating}
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
            >
              {statusOptions.map(value => (
                <option key={value} value={value}>
                  {statusLabel[value]}
                </option>
              ))}
            </select>
          </div>
          {updateMessage && (
            <p className="text-[11px] text-zinc-400">
              {updateMessage}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,3fr]">
        <section className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
            <h2 className="text-sm font-semibold text-zinc-50">
              Cliente
            </h2>
            <div className="mt-3 space-y-1 text-sm text-zinc-200">
              <p>
                {order.customer?.name || 'Cliente sin nombre'}
              </p>
              <p className="text-xs text-zinc-400">
                {order.customer?.phone || 'Sin teléfono'}
              </p>
              {order.deliveryAddress && (
                <p className="mt-2 text-xs text-zinc-300">
                  {order.deliveryAddress}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
            <h2 className="text-sm font-semibold text-zinc-50">
              Pago
            </h2>
            <div className="mt-3 space-y-1 text-sm text-zinc-200">
              <p className="text-lg font-semibold">
                ${formatCurrency(order.totalCents)}
              </p>
              <p className="text-xs text-zinc-400">
                Método: {order.paymentMethod || 'No especificado'}
              </p>
              {order.exchangeRate && (
                <p className="text-[11px] text-zinc-500">
                  Tasa BCV usada: {order.exchangeRate} Bs./USD
                </p>
              )}
            </div>
          </div>

          {order.notes && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
              <h2 className="text-sm font-semibold text-zinc-50">
                Notas del cliente
              </h2>
              <p className="mt-2 text-xs text-zinc-300">
                {order.notes}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
          <h2 className="text-sm font-semibold text-zinc-50">
            Productos
          </h2>
          <div className="mt-3 space-y-2 text-xs text-zinc-200">
            {!order.items?.length && (
              <p className="text-zinc-500">
                Esta orden no tiene productos registrados.
              </p>
            )}
            {order.items && order.items.length > 0 && (
              <div className="divide-y divide-zinc-800 rounded border border-zinc-800">
                {order.items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium text-zinc-100">
                        {item.product?.name || 'Producto sin nombre'}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {item.quantity} x ${formatCurrency(item.unitPriceCents)}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-zinc-100">
                      ${formatCurrency(item.unitPriceCents * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
          <h2 className="text-sm font-semibold text-zinc-50">
            Pagos de esta orden
          </h2>
          <div className="mt-3 space-y-3">
            <form onSubmit={handleCreatePayment} className="rounded border border-zinc-800 p-3 text-xs">
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Comprobante (URL)
                  </label>
                  <input
                    value={paymentImageUrl}
                    onChange={e => setPaymentImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Referencia
                  </label>
                  <input
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder="Número de referencia"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Notas
                  </label>
                  <input
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    placeholder="Opcional"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={creatingPayment}
                  className="rounded bg-emerald-500 px-3 py-1 text-xs font-medium text-zinc-950 disabled:opacity-70"
                >
                  {creatingPayment ? 'Registrando...' : 'Registrar pago'}
                </button>
              </div>
              {paymentMessage && (
                <p className="mt-1 text-[11px] text-zinc-400">
                  {paymentMessage}
                </p>
              )}
            </form>

            {!order.payments?.length && (
              <div className="rounded border border-zinc-800 p-3 text-xs text-zinc-400">
                No hay pagos registrados para esta orden.
              </div>
            )}
            {order.payments && order.payments.length > 0 && (
              <div className="divide-y divide-zinc-800 rounded border border-zinc-800">
                {order.payments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-100">
                          ${formatCurrency(payment.amountCents)}
                        </span>
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-200">
                          {payment.method}
                        </span>
                        <span className="rounded px-2 py-0.5 text-[10px] font-medium ${
                          payment.status === 'VERIFIED' ? 'bg-emerald-500 text-zinc-950' :
                          payment.status === 'REJECTED' ? 'bg-red-500 text-zinc-50' :
                          'bg-amber-500 text-zinc-950'
                        }">
                          {payment.status}
                        </span>
                      </div>
                      {payment.reference && (
                        <div className="mt-1 text-[11px] text-zinc-500">
                          Ref: {payment.reference}
                        </div>
                      )}
                      {payment.imageUrl && (
                        <a
                          href={payment.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-[11px] text-blue-400 underline"
                        >
                          Ver comprobante
                        </a>
                      )}
                      <div className="mt-1 text-[10px] text-zinc-500">
                        {formatDateTime(payment.createdAt)}
                      </div>
                    </div>
                    {payment.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerifyPayment(payment.id, 'VERIFIED')}
                          className="rounded bg-emerald-500 px-2 py-1 text-[11px] font-medium text-zinc-950"
                        >
                          Verificar
                        </button>
                        <button
                          onClick={() => handleVerifyPayment(payment.id, 'REJECTED')}
                          className="rounded border border-red-500 px-2 py-1 text-[11px] font-medium text-red-500"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
