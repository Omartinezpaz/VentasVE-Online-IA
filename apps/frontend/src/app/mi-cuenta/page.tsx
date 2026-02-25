'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getCustomerAccessToken, setCustomerAccessToken } from '@/lib/auth/customer-storage';

type DecodedCustomerToken = {
  sub?: string;
  email?: string;
  businessId?: string;
  profileType?: string;
};

const decodeCustomerToken = (token: string): DecodedCustomerToken | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const json = typeof window === 'undefined'
      ? Buffer.from(padded, 'base64').toString('utf-8')
      : window.atob(padded);
    const parsed = JSON.parse(json);
    return parsed as DecodedCustomerToken;
  } catch {
    return null;
  }
};

export default function MiCuentaPage() {
  const [token, setToken] = useState<string | null>(() => getCustomerAccessToken());
  const [decoded, setDecoded] = useState<DecodedCustomerToken | null>(() => {
    const stored = getCustomerAccessToken();
    if (!stored) {
      return null;
    }
    return decodeCustomerToken(stored);
  });

  const handleLogout = () => {
    setCustomerAccessToken(null);
    setToken(null);
    setDecoded(null);
  };

  const isLoggedIn = !!token;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(245,200,66,0.08),_transparent_55%),_radial-gradient(ellipse_at_bottom,_rgba(79,142,247,0.07),_transparent_55%),_#050712] text-zinc-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold">Mi cuenta</h1>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Gestiona tu sesión de cliente y accede a tus pedidos.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-zinc-50"
          >
            Ir al catálogo
          </Link>
        </header>

        {isLoggedIn ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-[13px]">
              <div className="mb-2 text-[12px] text-zinc-400">Sesión activa</div>
              <div className="text-sm font-semibold text-zinc-50">
                {decoded?.email || 'Cliente registrado'}
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                Perfil: {decoded?.profileType || 'REGISTERED'}
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/mi-cuenta/pedidos"
                className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-50"
              >
                <div>
                  <div className="font-semibold">Ver mis pedidos</div>
                  <div className="text-[11px] text-emerald-100/80">
                    Historial de compras asociadas a esta cuenta.
                  </div>
                </div>
                <span className="text-lg">📦</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-100"
              >
                Cerrar sesión de cliente
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-[13px]">
              <div className="mb-2 text-[12px] text-zinc-400">Sin sesión activa</div>
              <p className="text-zinc-200">
                Aún no tienes una sesión de cliente en este dispositivo.
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                Cuando completes una compra desde el catálogo con tu correo, crearemos una
                cuenta ligera para que puedas ver tus pedidos aquí.
              </p>
            </div>

            <Link
              href="/mi-cuenta/pedidos"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] text-zinc-50"
            >
              <div>
                <div className="font-semibold">Ver mis pedidos</div>
                <div className="text-[11px] text-zinc-200/80">
                  Si ya hiciste compras en este dispositivo, verás tu historial.
                </div>
              </div>
              <span className="text-lg">📦</span>
            </Link>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-[11px] text-zinc-400">
          En una próxima etapa podrás iniciar sesión con correo y contraseña para recuperar
          tu cuenta en otros dispositivos.
        </div>
      </div>
    </div>
  );
}
