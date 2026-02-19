'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WhatsappStatusBadge } from './WhatsappStatusBadge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { ordersApi } from '@/lib/api/orders';
import { getAccessToken, setAccessToken } from '@/lib/auth/storage';
import { paymentsApi } from '@/lib/api/payments';
import { disconnectSocket } from '@/lib/socket/client';

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  const handleLogout = () => {
    setAccessToken(null);
    disconnectSocket();
    router.replace('/auth/login');
  };

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    const loadCounts = async () => {
      try {
        const response = await ordersApi.list({ status: 'PENDING', limit: 1 });
        setNewOrdersCount(response.data.meta.total);
      } catch {
      }
      try {
        const payments = await paymentsApi.list({ status: 'PENDING', limit: 1 });
        setPendingPaymentsCount(payments.data.meta.total);
      } catch {
      }
    };

    loadCounts();
  }, []);

  useWebSocket('new_order', () => {
    setNewOrdersCount(prev => prev + 1);
  });

  useWebSocket('new_message', () => {
    setUnreadCount(prev => prev + 1);
  });

  useWebSocket('new_payment', () => {
    setPendingPaymentsCount(prev => prev + 1);
  });
  useWebSocket('payment_verified', () => {
    setPendingPaymentsCount(prev => Math.max(0, prev - 1));
  });

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <div className="flex">
        <aside className="hidden w-56 border-r border-[var(--border)] bg-[var(--bg-sidebar)] px-4 py-4 md:block">
          <div className="mb-6">
            <div className="text-sm font-semibold tracking-tight">
              Ventas<span className="text-amber-400">VE</span>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Panel del negocio
            </div>
          </div>
          <nav className="space-y-4 text-sm">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Órdenes
              </div>
              <Link
                href="/dashboard/orders"
                className="flex items-center justify-between rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-100"
              >
                <span>Órdenes</span>
                {newOrdersCount > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                    {newOrdersCount}
                  </span>
                )}
              </Link>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Clientes
              </div>
              <Link
                href="/dashboard/customers"
                className="flex items-center rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-100"
              >
                Clientes
              </Link>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Mensajes
              </div>
              <Link
                href="/dashboard/inbox"
                className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-900"
              >
                <span>WhatsApp</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Pagos
              </div>
              <Link
                href="/dashboard/payments"
                className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-900"
              >
                <span>Pagos</span>
                {pendingPaymentsCount > 0 && (
                  <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                    {pendingPaymentsCount}
                  </span>
                )}
              </Link>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Negocio
              </div>
              <Link
                href="/dashboard/settings"
                className="flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-900"
              >
                Configuración
              </Link>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Cuenta
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-900"
              >
                Salir
              </button>
            </div>
          </nav>
        </aside>
        <main className="flex-1">
          <header className="border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md px-4 py-3 sticky top-0 z-30">
            <div className="mx-auto flex max-w-6xl items-center justify-between">
              <div>
                <h1 className="text-sm font-bold tracking-tight text-[var(--foreground)]">
                  VentasVE
                </h1>
                <p className="text-[10px] text-[var(--muted)] font-medium uppercase tracking-widest">
                  Gestión Comercial
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <WhatsappStatusBadge />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-[11px] font-medium text-zinc-200 hover:border-red-500/60 hover:text-red-200"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-6xl px-4 py-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
