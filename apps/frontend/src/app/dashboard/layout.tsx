'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { WhatsappStatusBadge } from './WhatsappStatusBadge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { ordersApi } from '@/lib/api/orders';
import { getAccessToken, setAccessToken } from '@/lib/auth/storage';
import { paymentsApi } from '@/lib/api/payments';
import { disconnectSocket } from '@/lib/socket/client';
import { settingsApi } from '@/lib/api/settings';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const apiBaseUrl = new URL(API_BASE);
const IMAGE_BASE_ORIGIN = `${apiBaseUrl.protocol}//${apiBaseUrl.host}`;
const SOUND_PREF_KEY = 'ventasve:dashboard:pushSound';

type NewOrderEvent = {
  id: string;
  orderNumber: number | null;
  totalCents: number;
  status: string;
  paymentMethod?: string | null;
  customer?: {
    name?: string | null;
  } | null;
};

type PaymentEvent = {
  id: string;
  orderId?: string;
  status?: string;
  amountCents?: number;
  method?: string;
  order?: {
    orderNumber?: number | null;
  } | null;
};

type OrderStatusChangedEvent = {
  orderId: string;
  status: string;
  order?: {
    orderNumber?: number | null;
    totalCents?: number;
  } | null;
};

type ToastVariant = 'info' | 'success' | 'warning';

type Toast = {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
};

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type PushPrefs = {
  newOrderToast: boolean;
  newOrderSound: boolean;
  paymentVerifiedToast: boolean;
  paymentVerifiedSound: boolean;
  orderStatusUpdateToast: boolean;
  orderStatusUpdateSound: boolean;
  newMessageToast: boolean;
  newMessageSound: boolean;
};

const resolveLogoUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${IMAGE_BASE_ORIGIN}${url}`;
};

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const pathname = usePathname();
  const [businessName, setBusinessName] = useState<string>('Gestión comercial');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [headerImage] = useState<string>('/imagen de fondo para.png');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [pushPrefs, setPushPrefs] = useState<PushPrefs>({
    newOrderToast: true,
    newOrderSound: true,
    paymentVerifiedToast: true,
    paymentVerifiedSound: true,
    orderStatusUpdateToast: true,
    orderStatusUpdateSound: false,
    newMessageToast: false,
    newMessageSound: false
  });

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const baseLink =
    'flex items-center rounded-md px-3.5 py-2.5 text-base font-medium transition-colors';
  const activeLink = 'bg-[var(--surface2)] text-[var(--foreground)]';
  const inactiveLink = 'text-[var(--muted)] hover:bg-[var(--background)]/60';

  const showToast = (title: string, message: string, variant: ToastVariant = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, title, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const playSound = () => {
    if (!soundEnabled) return;
    if (typeof window === 'undefined') return;
    try {
      const audioWindow = window as AudioWindow;
      const AudioContextCtor =
        audioWindow.AudioContext || audioWindow.webkitAudioContext;
      if (!AudioContextCtor) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextCtor();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
    }
  };

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
    settingsApi
      .get()
      .then(res => {
        const data = res.data;
        if (data.name) {
          setBusinessName(data.name);
        }
        if (data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
        const notif = data.notificationSettings ?? {};
        const push = (notif.push ?? {}) as Partial<PushPrefs>;
        const merged: PushPrefs = {
          newOrderToast: push.newOrderToast ?? true,
          newOrderSound: push.newOrderSound ?? true,
          paymentVerifiedToast: push.paymentVerifiedToast ?? true,
          paymentVerifiedSound: push.paymentVerifiedSound ?? true,
          orderStatusUpdateToast: push.orderStatusUpdateToast ?? true,
          orderStatusUpdateSound: push.orderStatusUpdateSound ?? false,
          newMessageToast: push.newMessageToast ?? false,
          newMessageSound: push.newMessageSound ?? false
        };
        setPushPrefs(merged);
        const soundActive = merged.newOrderSound || merged.paymentVerifiedSound;
        setSoundEnabled(soundActive);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            SOUND_PREF_KEY,
            soundActive ? 'on' : 'off'
          );
        }
      })
      .catch(() => {});
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const readPref = () => {
      const value = window.localStorage.getItem(SOUND_PREF_KEY);
      if (value === 'off') {
        setSoundEnabled(false);
      } else {
        setSoundEnabled(true);
      }
    };
    readPref();
    const handler = (event: StorageEvent) => {
      if (event.key === SOUND_PREF_KEY) {
        readPref();
      }
    };
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('storage', handler);
    };
  }, []);

  useWebSocket<NewOrderEvent>('new_order', payload => {
    setNewOrdersCount(prev => prev + 1);
    const code = payload.orderNumber
      ? `#${payload.orderNumber}`
      : payload.id.slice(0, 8).toUpperCase();
    const customerName = payload.customer?.name || 'Cliente sin nombre';
    const totalLabel =
      typeof payload.totalCents === 'number'
        ? (payload.totalCents / 100).toFixed(2)
        : null;
    const parts = [`De ${customerName}`];
    if (totalLabel) {
      parts.push(`Total $${totalLabel}`);
    }
    if (pushPrefs.newOrderToast) {
      showToast(`Nueva orden ${code}`, parts.join(' · '), 'success');
    }
    if (pushPrefs.newOrderSound) {
      playSound();
    }
  });

  useWebSocket('new_message', () => {
    setUnreadCount(prev => prev + 1);
    if (pushPrefs.newMessageToast) {
      showToast('Nuevo mensaje', 'Tienes un mensaje pendiente en el inbox', 'info');
    }
    if (pushPrefs.newMessageSound) {
      playSound();
    }
  });

  useWebSocket<PaymentEvent>('new_payment', payload => {
    setPendingPaymentsCount(prev => prev + 1);
    const amountLabel =
      typeof payload.amountCents === 'number'
        ? (payload.amountCents / 100).toFixed(2)
        : null;
    const parts = [];
    if (payload.method) {
      parts.push(payload.method);
    }
    if (amountLabel) {
      parts.push(`$${amountLabel}`);
    }
    const orderCode = payload.order?.orderNumber
      ? ` #${payload.order.orderNumber}`
      : '';
    const message =
      parts.length > 0
        ? `${parts.join(' · ')}${orderCode}`
        : `Pago pendiente${orderCode}`;
    if (pushPrefs.paymentVerifiedToast) {
      showToast('Nuevo pago registrado', message, 'info');
    }
  });

  useWebSocket<PaymentEvent>('payment_verified', payload => {
    setPendingPaymentsCount(prev => Math.max(0, prev - 1));
    const orderCode = payload.order?.orderNumber
      ? `#${payload.order.orderNumber}`
      : '';
    const title = orderCode ? `Pago verificado ${orderCode}` : 'Pago verificado';
    if (pushPrefs.paymentVerifiedToast) {
      showToast(title, 'El pago fue verificado correctamente', 'success');
    }
    if (pushPrefs.paymentVerifiedSound) {
      playSound();
    }
  });

  useWebSocket<OrderStatusChangedEvent>('order_status_changed', payload => {
    const code = payload.order?.orderNumber
      ? `#${payload.order.orderNumber}`
      : payload.orderId.slice(0, 8).toUpperCase();
    if (pushPrefs.orderStatusUpdateToast) {
      const title = `Estado de orden actualizado ${code}`;
      const message = `Nuevo estado: ${payload.status}`;
      showToast(title, message, 'info');
    }
    if (pushPrefs.orderStatusUpdateSound) {
      playSound();
    }
  });

  const toastColors: Record<ToastVariant, string> = {
    info: 'border-blue-500/40 bg-blue-950/50 text-blue-100',
    success: 'border-emerald-500/40 bg-emerald-950/50 text-emerald-100',
    warning: 'border-amber-500/40 bg-amber-950/60 text-amber-100'
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <div className="flex">
        <aside className="hidden w-72 border-r border-[var(--border)] bg-[var(--bg-sidebar)] px-6 py-6 md:block">
          <div className="mb-6">
            <div className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Ventas<span className="text-amber-400">VE</span>
            </div>
            <div className="mt-1 text-sm uppercase tracking-[0.16em] text-[var(--muted)]">
              Panel del negocio
            </div>
          </div>
          <nav className="space-y-4 text-base">
            <div>
              <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Principal
              </div>
              <Link
                href="/dashboard"
                className={`${baseLink} ${isActive('/dashboard', true) ? activeLink : inactiveLink}`}
              >
                Dashboard
              </Link>
            </div>
            <div>
              <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Ventas
              </div>
              <Link
                href="/dashboard/orders"
                className={`${baseLink} justify-between ${isActive('/dashboard/orders') ? activeLink : inactiveLink}`}
              >
                <span>Órdenes</span>
                {newOrdersCount > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                    {newOrdersCount}
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard/products"
                className={`${baseLink} ${isActive('/dashboard/products') ? activeLink : inactiveLink}`}
              >
                Catálogo
              </Link>
            </div>
            <div>
              <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Clientes
              </div>
              <Link
                href="/dashboard/customers"
                className={`${baseLink} ${isActive('/dashboard/customers') ? activeLink : inactiveLink}`}
              >
                Clientes
              </Link>
            </div>
            <div>
              <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Mensajes
              </div>
              <Link
                href="/dashboard/inbox"
                className={`${baseLink} justify-between ${isActive('/dashboard/inbox') ? activeLink : inactiveLink}`}
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
              <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Pagos
              </div>
              <Link
                href="/dashboard/payments"
                className={`${baseLink} justify-between ${isActive('/dashboard/payments') ? activeLink : inactiveLink}`}
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
              <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Negocio
              </div>
              <Link
                href="/dashboard/settings"
                className={`${baseLink} ${isActive('/dashboard/settings') ? activeLink : inactiveLink}`}
              >
                Configuración
              </Link>
              <Link
                href="/dashboard/exchange-rate"
                className={`${baseLink} ${isActive('/dashboard/exchange-rate') ? activeLink : inactiveLink}`}
              >
                Tasa de Cambio
              </Link>
              <Link
                href="/dashboard/reports"
                className={`${baseLink} ${isActive('/dashboard/reports') ? activeLink : inactiveLink}`}
              >
                Reportes
              </Link>
            </div>
            <div>
              <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Cuenta
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-[var(--muted)] hover:bg-[var(--background)]/60"
              >
                Salir
              </button>
            </div>
          </nav>
        </aside>
        <main className="flex-1">
          <header
            className="sticky top-0 z-30 border-b border-[var(--border)] bg-black bg-cover bg-center px-4 pt-4 pb-6 md:pt-6 md:pb-8 relative overflow-hidden group flex items-end"
            style={{
              backgroundImage: `url('${headerImage}')`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: '280px'
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:opacity-100 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.85),rgba(0,0,0,0.35),rgba(0,0,0,0.9))]"
            />
            <div className="relative flex w-full items-end justify-between gap-3 md:gap-6">
              <div className="flex flex-col items-start gap-2 md:gap-3">
                <div className="relative h-32 w-32 md:h-40 md:w-40 overflow-hidden rounded-full border-2 border-white bg-black flex items-center justify-center">
                  {logoUrl ? (
                    <img
                      src={resolveLogoUrl(logoUrl)}
                      alt={businessName || 'Logo del negocio'}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-white">
                      VE
                    </span>
                  )}
                </div>
                <div className="mt-1 leading-tight rounded-xl bg-black/70 px-3 py-2 shadow-md">
                  <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white">
                    {businessName}
                  </h1>
                  <p className="text-xs md:text-sm text-zinc-300 font-medium uppercase tracking-widest">
                    Gestión comercial
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <WhatsappStatusBadge />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-medium text-[var(--foreground)] hover:border-red-500/60 hover:text-red-200"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </header>
          <div className="px-8 py-6 text-[15px]">
            {children}
          </div>
        </main>
      </div>
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-xs flex-col gap-2">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl border px-3 py-2 text-xs shadow-lg shadow-black/40 ${toastColors[toast.variant]}`}
            >
              <div className="font-semibold">{toast.title}</div>
              <div className="mt-0.5 text-[11px] opacity-90">{toast.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
