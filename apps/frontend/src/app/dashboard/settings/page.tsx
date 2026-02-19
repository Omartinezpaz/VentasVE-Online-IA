'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { whatsappApi, WhatsappStatus } from '@/lib/api/whatsapp';
import { getAccessToken } from '@/lib/auth/storage';
import { settingsApi, BusinessSettings } from '@/lib/api/settings';

export default function SettingsPage() {
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessSettings>({});
  const [zelleEmail, setZelleEmail] = useState('');
  const [zelleName, setZelleName] = useState('');
  const [pagoMovilPhone, setPagoMovilPhone] = useState('');
  const [pagoMovilBank, setPagoMovilBank] = useState('');
  const [pagoMovilId, setPagoMovilId] = useState('');
  const [binanceId, setBinanceId] = useState('');
  const [transferAccount, setTransferAccount] = useState('');
  const [transferName, setTransferName] = useState('');
  const [showBs, setShowBs] = useState(true);
  const [showStock, setShowStock] = useState(false);
  const [showChatButton, setShowChatButton] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsappStatus | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await settingsApi.get();
        const data = response.data;
        const paymentMethods = data.paymentMethods ?? {};
        const zelle = paymentMethods.zelle as
          | {
              email?: string;
              name?: string;
            }
          | undefined;
        const pagoMovil = paymentMethods.pagoMovil as
          | {
              phone?: string;
              bank?: string;
              id?: string;
            }
          | undefined;
        const binance = paymentMethods.binance as
          | {
              id?: string;
            }
          | undefined;
        const transfer = paymentMethods.transfer as
          | {
              account?: string;
              name?: string;
            }
          | undefined;

        const catalogOptions = data.catalogOptions ?? {};

        setBusiness({
          name: data.name ?? '',
          slug: data.slug ?? '',
          whatsappPhone: data.whatsappPhone ?? '',
          city: data.city ?? '',
          instagram: data.instagram ?? '',
          schedule: data.schedule ?? '',
          description: data.description ?? ''
        });
        setZelleEmail(zelle?.email ?? '');
        setZelleName(zelle?.name ?? '');
        setPagoMovilPhone(pagoMovil?.phone ?? '');
        setPagoMovilBank(pagoMovil?.bank ?? '');
        setPagoMovilId(pagoMovil?.id ?? '');
        setBinanceId(binance?.id ?? '');
        setTransferAccount(transfer?.account ?? '');
        setTransferName(transfer?.name ?? '');
        setShowBs(catalogOptions.showBs ?? true);
        setShowStock(catalogOptions.showStock ?? false);
        setShowChatButton(catalogOptions.showChatButton ?? true);
      } catch {
        setError('No se pudieron cargar los datos del negocio');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  useEffect(() => {
    const loadWhatsappStatus = async () => {
      setWhatsappLoading(true);
      setError(null);
      try {
        const response = await whatsappApi.getStatus();
        setWhatsappStatus(response.data);
      } catch {
        setError('No se pudo cargar el estado de WhatsApp');
      } finally {
        setWhatsappLoading(false);
      }
    };

    loadWhatsappStatus();
  }, []);

  const handleBusinessChange = (field: keyof BusinessSettings, value: string) => {
    setBusiness(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const paymentMethods = {
        zelle: {
          email: zelleEmail,
          name: zelleName
        },
        pagoMovil: {
          phone: pagoMovilPhone,
          bank: pagoMovilBank,
          id: pagoMovilId
        },
        binance: {
          id: binanceId
        },
        transfer: {
          account: transferAccount,
          name: transferName
        }
      };

      const catalogOptions = {
        showBs,
        showStock,
        showChatButton
      };

      await settingsApi.update({
        name: business.name || undefined,
        slug: business.slug || undefined,
        whatsappPhone: business.whatsappPhone || undefined,
        city: business.city || undefined,
        instagram: business.instagram || undefined,
        schedule: business.schedule || undefined,
        description: business.description || undefined,
        paymentMethods,
        catalogOptions
      });
    } catch {
      setError('No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-base font-semibold text-zinc-50">
            Configuración
          </h1>
          <p className="text-xs text-zinc-500">
            Ajustes de tu negocio, WhatsApp, catálogo y métodos de pago.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-black shadow disabled:opacity-70"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-400">
          Cargando configuración del negocio...
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-[1.8fr,1.4fr]">
        <div className="space-y-4">
          <div className="card-elevated rounded-2xl border border-zinc-800 bg-zinc-900/80">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="font-heading text-sm font-semibold text-zinc-50">
                  Mi negocio
                </h2>
                <p className="text-xs text-zinc-500">
                  Datos que verán tus clientes en el catálogo público.
                </p>
              </div>
            </div>
            <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">
                  Nombre de la tienda
                </label>
                <input
                  type="text"
                  value={business.name}
                  onChange={event => handleBusinessChange('name', event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Mis Modas 2025"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">
                  Usuario / slug (URL)
                </label>
                <input
                  type="text"
                  value={business.slug}
                  onChange={event => handleBusinessChange('slug', event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="mismodas2025"
                />
                <p className="mt-1 text-[10px] text-zinc-500">
                  ventasve.app/c/{business.slug || 'tutienda'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">
                  Teléfono WhatsApp
                </label>
                <input
                  type="tel"
                  value={business.whatsappPhone}
                  onChange={event => handleBusinessChange('whatsappPhone', event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="+58 412-555-0123"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">
                  Ciudad principal
                </label>
                <select
                  value={business.city}
                  onChange={event => handleBusinessChange('city', event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <option value="">Selecciona una ciudad</option>
                  <option value="Caracas">Caracas</option>
                  <option value="Maracaibo">Maracaibo</option>
                  <option value="Valencia">Valencia</option>
                  <option value="Barquisimeto">Barquisimeto</option>
                  <option value="Maturín">Maturín</option>
                  <option value="Barcelona">Barcelona</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">
                  Instagram
                </label>
                <input
                  type="text"
                  value={business.instagram}
                  onChange={event => handleBusinessChange('instagram', event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="@mismodas2025"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">
                  Horario de atención
                </label>
                <input
                  type="text"
                  value={business.schedule}
                  onChange={event => handleBusinessChange('schedule', event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Lun–Sáb 8am–6pm"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-medium text-zinc-400">
                  Descripción de la tienda
                </label>
                <textarea
                  value={business.description}
                  onChange={event => handleBusinessChange('description', event.target.value)}
                  className="min-h-[80px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Cuenta brevemente qué vendes y cómo atiendes a tus clientes."
                />
                <p className="mt-1 text-[10px] text-zinc-500">
                  Esta descripción se mostrará en la cabecera de tu catálogo público.
                </p>
              </div>
            </div>
          </div>

          <div className="card-elevated rounded-2xl border border-zinc-800 bg-zinc-900/80">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="font-heading text-sm font-semibold text-zinc-50">
                  Métodos de pago
                </h2>
                <p className="text-xs text-zinc-500">
                  Define cómo pueden pagarte tus clientes.
                </p>
              </div>
            </div>
            <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-zinc-100">
                      Zelle
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Correo o teléfono asociado a Zelle.
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Activo
                  </span>
                </div>
                <input
                  type="text"
                  value={zelleEmail}
                  onChange={event => setZelleEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Email o teléfono Zelle"
                />
                <input
                  type="text"
                  value={zelleName}
                  onChange={event => setZelleName(event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Nombre del titular"
                />
              </div>
              <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-zinc-100">
                      Pago móvil
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Número, banco y cédula del titular.
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Activo
                  </span>
                </div>
                <input
                  type="text"
                  value={pagoMovilPhone}
                  onChange={event => setPagoMovilPhone(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="04145550123"
                />
                <select
                  value={pagoMovilBank}
                  onChange={event => setPagoMovilBank(event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <option value="">Selecciona un banco</option>
                  <option value="Banesco">Banesco</option>
                  <option value="Banco de Venezuela">Banco de Venezuela</option>
                  <option value="Mercantil">Mercantil</option>
                  <option value="Provincial">Provincial</option>
                  <option value="Otro banco">Otro banco</option>
                </select>
                <input
                  type="text"
                  value={pagoMovilId}
                  onChange={event => setPagoMovilId(event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Cédula del titular"
                />
              </div>
              <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-zinc-100">
                      Binance Pay
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      ID o correo de Binance Pay.
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Activo
                  </span>
                </div>
                <input
                  type="text"
                  value={binanceId}
                  onChange={event => setBinanceId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Binance Pay ID o email"
                />
              </div>
              <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-zinc-100">
                      Transferencia Bs.
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Cuenta bancaria en bolívares.
                    </div>
                  </div>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                    Opcional
                  </span>
                </div>
                <input
                  type="text"
                  value={transferAccount}
                  onChange={event => setTransferAccount(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Número de cuenta"
                />
                <input
                  type="text"
                  value={transferName}
                  onChange={event => setTransferName(event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Titular"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-elevated rounded-2xl border border-zinc-800 bg-zinc-900/80">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="font-heading text-sm font-semibold text-zinc-50">
                  WhatsApp
                </h2>
                <p className="text-xs text-zinc-500">
                  Conecta tu número para recibir pedidos por WhatsApp.
                </p>
              </div>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                <div>
                  <div className="text-xs font-semibold text-zinc-100">
                    Estado de conexión
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {whatsappLoading
                      ? 'Verificando conexión...'
                      : whatsappStatus?.connected
                        ? 'Tu negocio está conectado a WhatsApp.'
                        : 'Conecta tu WhatsApp para empezar a recibir pedidos.'}
                  </div>
                </div>
                <span
                  className={
                    whatsappStatus?.connected
                      ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400'
                      : 'rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400'
                  }
                >
                  {whatsappStatus?.connected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              {!whatsappStatus?.connected && whatsappStatus?.qr && (
                <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="text-xs font-semibold text-zinc-100">
                    Escanea el código QR en WhatsApp
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Abre WhatsApp &gt; Dispositivos vinculados y escanea este QR
                    para conectar tu negocio.
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Image
                      src={whatsappStatus.qr}
                      alt="Código QR de WhatsApp"
                      width={160}
                      height={160}
                      className="h-40 w-40 rounded bg-white p-2"
                      unoptimized
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card-elevated rounded-2xl border border-zinc-800 bg-zinc-900/80">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="font-heading text-sm font-semibold text-zinc-50">
                Catálogo público
              </h2>
              <p className="text-xs text-zinc-500">
                Preferencias básicas del catálogo que ven tus clientes.
              </p>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <div className="text-xs font-medium text-zinc-100">
                    Mostrar precios en bolívares
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Convierte en tiempo real usando la tasa BCV.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBs(prev => !prev)}
                  className={
                    showBs
                      ? 'inline-flex h-6 w-10 items-center rounded-full bg-emerald-500/20 px-1'
                      : 'inline-flex h-6 w-10 items-center rounded-full bg-zinc-700 px-1'
                  }
                >
                  <span
                    className={
                      showBs
                        ? 'inline-block h-4 w-4 translate-x-4 rounded-full bg-emerald-400'
                        : 'inline-block h-4 w-4 translate-x-0 rounded-full bg-zinc-300'
                    }
                  />
                </button>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <div className="text-xs font-medium text-zinc-100">
                    Mostrar stock disponible
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Tus clientes verán cuántas unidades quedan de cada producto.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStock(prev => !prev)}
                  className={
                    showStock
                      ? 'inline-flex h-6 w-10 items-center rounded-full bg-emerald-500/20 px-1'
                      : 'inline-flex h-6 w-10 items-center rounded-full bg-zinc-700 px-1'
                  }
                >
                  <span
                    className={
                      showStock
                        ? 'inline-block h-4 w-4 translate-x-4 rounded-full bg-emerald-400'
                        : 'inline-block h-4 w-4 translate-x-0 rounded-full bg-zinc-300'
                    }
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-zinc-100">
                    Chat flotante de WhatsApp
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Muestra un botón verde en el catálogo para abrir WhatsApp.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChatButton(prev => !prev)}
                  className={
                    showChatButton
                      ? 'inline-flex h-6 w-10 items-center rounded-full bg-emerald-500/20 px-1'
                      : 'inline-flex h-6 w-10 items-center rounded-full bg-zinc-700 px-1'
                  }
                >
                  <span
                    className={
                      showChatButton
                        ? 'inline-block h-4 w-4 translate-x-4 rounded-full bg-emerald-400'
                        : 'inline-block h-4 w-4 translate-x-0 rounded-full bg-zinc-300'
                    }
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
