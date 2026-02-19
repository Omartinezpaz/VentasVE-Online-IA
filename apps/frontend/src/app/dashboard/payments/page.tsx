'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { paymentsApi, Payment } from '@/lib/api/payments';
import { getAccessToken } from '@/lib/auth/storage';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    const load = async () => {
      try {
        const response = await paymentsApi.list({ status: 'PENDING' });
        setPayments(response.data.data);
      } catch {
        setError('No se pudieron cargar los pagos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  useWebSocket<Payment>('new_payment', payment => {
    if (payment.status === 'PENDING') {
      setPayments(prev => [payment, ...prev]);
    }
  });

  useWebSocket<Payment>('payment_verified', updated => {
    setPayments(prev => prev.filter(p => p.id !== updated.id));
  });

  const verifyPayment = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    setVerifyingId(id);
    try {
      await paymentsApi.verify(id, status);
      setPayments(prev => prev.filter(p => p.id !== id));
    } catch {
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-6 text-sm text-zinc-400">
        Cargando pagos...
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-50">
            Pagos pendientes
          </h2>
          <p className="text-xs text-zinc-500">
            Verifica comprobantes y confirma pedidos.
          </p>
        </div>
      </div>
      {!payments.length ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-sm text-zinc-400">
          No hay pagos pendientes por verificar.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {payments.map(payment => (
            <div key={payment.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">
                  Orden #{payment.order?.orderNumber || payment.orderId.slice(0, 8)}
                </span>
                <span className="text-lg font-semibold">
                  {formatCurrency(payment.amountCents)}
                </span>
              </div>
              <div className="mt-2 text-sm">
                <p className="text-zinc-300">{payment.method}</p>
                {payment.reference && (
                  <p className="text-xs text-zinc-500">Ref: {payment.reference}</p>
                )}
                {payment.order?.customer?.phone && (
                  <p className="text-[11px] text-zinc-500">
                    {payment.order.customer.name || 'Cliente'} · {payment.order.customer.phone}
                  </p>
                )}
              </div>
              {payment.imageUrl && (
                <Image
                  src={payment.imageUrl}
                  alt="Comprobante"
                  width={400}
                  height={200}
                  className="mt-3 max-h-32 w-full rounded border border-zinc-700 object-cover"
                  unoptimized
                />
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => verifyPayment(payment.id, 'VERIFIED')}
                  disabled={verifyingId === payment.id}
                  className="flex-1 rounded bg-emerald-500 px-3 py-1 text-sm font-medium text-black disabled:opacity-70"
                >
                  {verifyingId === payment.id ? 'Verificando...' : 'Verificar'}
                </button>
                <button
                  onClick={() => verifyPayment(payment.id, 'REJECTED')}
                  disabled={verifyingId === payment.id}
                  className="flex-1 rounded border border-red-500 px-3 py-1 text-sm font-medium text-red-500 disabled:opacity-70"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
