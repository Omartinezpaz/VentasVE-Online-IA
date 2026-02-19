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
          <h1 className="font-heading text-xl font-bold text-zinc-50">
            Configuración
          </h1>
          <p className="text-xs text-zinc-400">
            Ajustes de tu negocio, WhatsApp, catálogo y métodos de pago.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-zinc-950 shadow-lg shadow-orange-950/20 transition-transform active:scale-95 disabled:opacity-70"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100 shadow-xl">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-400 shadow-xl">
          Cargando configuración del negocio...
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr,0.8fr]">
        <div className="space-y-6">
          <div className="card-elevated overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-xl">
            <div className="border-b border-[var(--border)] px-6 py-5">
              <h2 className="font-heading text-lg font-bold text-[var(--foreground)]">
                Mi negocio
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Datos que verán tus clientes en el catálogo público.
              </p>
            </div>
            <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
                  Nombre de la tienda
                </label>
                <input
                  type="text"
                  value={business.name}
                  onChange={event => handleBusinessChange('name', event.target.value)}
                  className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-all focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  placeholder="Mis Modas 2025"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Usuario / slug (URL)
                </label>
                <input
                  type="text"
                  value={business.slug}
                  onChange={event => handleBusinessChange('slug', event.target.value)}
                  className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  placeholder="mismodas2025"
                />
                <p className="mt-1.5 text-[10px] text-zinc-500 font-medium">
                  ventasve.app/c/{business.slug || 'tutienda'}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Teléfono WhatsApp
                </label>
                <input
                  type="tel"
                  value={business.whatsappPhone}
                  onChange={event => handleBusinessChange('whatsappPhone', event.target.value)}
                  className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  placeholder="+58 412-555-0123"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Ciudad principal
                </label>
                <select
                  value={business.city}
                  onChange={event => handleBusinessChange('city', event.target.value)}
                  className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 appearance-none"
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
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Instagram
                </label>
                <input
                  type="text"
                  value={business.instagram}
                  onChange={event => handleBusinessChange('instagram', event.target.value)}
                  className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  placeholder="@mismodas2025"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Horario de atención
                </label>
                <input
                  type="text"
                  value={business.schedule}
                  onChange={event => handleBusinessChange('schedule', event.target.value)}
                  className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                  placeholder="Lun–Sáb 8am–6pm"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  Descripción de la tienda
                </label>
                <textarea
                  value={business.description}
                  onChange={event => handleBusinessChange('description', event.target.value)}
                  className="min-h-[100px] w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 resize-none"
                  placeholder="Cuenta brevemente qué vendes y cómo atiendes a tus clientes."
                />
              </div>
            </div>
          </div>

          <div className="card-elevated overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-900/60 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-zinc-800 px-6 py-5">
              <h2 className="font-heading text-lg font-bold text-zinc-50">
                Métodos de pago
              </h2>
              <p className="text-xs text-zinc-500">
                Define cómo pueden pagarte tus clientes.
              </p>
            </div>
            <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
              <div className="space-y-3 rounded-2xl border-2 border-[var(--border)] bg-[var(--background)]/40 p-5 transition-all hover:border-[var(--muted)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💸</span>
                    <span className="text-sm font-bold text-[var(--foreground)]">Zelle</span>
                  </div>
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                    ACTIVO
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={zelleEmail}
                    onChange={event => setZelleEmail(event.target.value)}
                    className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all"
                    placeholder="Email o teléfono Zelle"
                  />
                  <input
                    type="text"
                    value={zelleName}
                    onChange={event => setZelleName(event.target.value)}
                    className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all"
                    placeholder="Nombre del titular"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border-2 border-zinc-800 bg-zinc-950/40 p-5 transition-all hover:border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📱</span>
                    <span className="text-sm font-bold text-zinc-100">Pago móvil</span>
                  </div>
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                    ACTIVO
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={pagoMovilPhone}
                    onChange={event => setPagoMovilPhone(event.target.value)}
                    className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] transition-all"
                    placeholder="Número de teléfono"
                  />
                  <select
                    value={pagoMovilBank}
                    onChange={event => setPagoMovilBank(event.target.value)}
                    className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] transition-all appearance-none"
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
                    className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] transition-all"
                    placeholder="Cédula del titular"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border-2 border-zinc-800 bg-zinc-950/40 p-5 transition-all hover:border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <span className="text-sm font-bold text-zinc-100">Binance Pay</span>
                  </div>
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                    ACTIVO
                  </span>
                </div>
                <input
                  type="text"
                  value={binanceId}
                  onChange={event => setBinanceId(event.target.value)}
                  className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] transition-all"
                  placeholder="Binance Pay ID o email"
                />
              </div>

              <div className="space-y-3 rounded-2xl border-2 border-zinc-800 bg-zinc-950/40 p-5 transition-all hover:border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏦</span>
                    <span className="text-sm font-bold text-zinc-100">Transferencia</span>
                  </div>
                  <span className="rounded-lg bg-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-500 border border-zinc-700">
                    OPCIONAL
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={transferAccount}
                    onChange={event => setTransferAccount(event.target.value)}
                    className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] transition-all"
                    placeholder="Número de cuenta"
                  />
                  <input
                    type="text"
                    value={transferName}
                    onChange={event => setTransferName(event.target.value)}
                    className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] transition-all"
                    placeholder="Titular"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-elevated overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-900/60 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-zinc-800 px-6 py-5">
              <h2 className="font-heading text-lg font-bold text-zinc-50">
                WhatsApp
              </h2>
              <p className="text-xs text-zinc-500">
                Conecta tu número para recibir pedidos.
              </p>
            </div>
            <div className="space-y-4 px-6 py-6">
              <div className="flex items-center justify-between rounded-2xl border-2 border-zinc-800 bg-zinc-950/40 px-4 py-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-zinc-100 uppercase tracking-tight">
                    Estado de conexión
                  </div>
                  <div className="text-[11px] text-zinc-500 leading-relaxed max-w-[180px]">
                    {whatsappLoading
                      ? 'Verificando conexión...'
                      : whatsappStatus?.connected
                        ? 'Tu negocio está conectado a WhatsApp.'
                        : 'Conecta tu WhatsApp para empezar a recibir pedidos.'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   {whatsappStatus?.connected && <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                  <span
                    className={
                      whatsappStatus?.connected
                        ? 'text-xs font-bold text-emerald-400'
                        : 'text-xs font-bold text-zinc-500'
                    }
                  >
                    {whatsappStatus?.connected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              </div>

              {!whatsappStatus?.connected && whatsappStatus?.qr && (
                <div className="space-y-4 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950/20 p-6 text-center">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-zinc-100">
                      Escanea el código QR
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">
                      Abre WhatsApp &gt; Dispositivos vinculados y escanea este QR.
                    </p>
                  </div>
                  <div className="mx-auto inline-block rounded-2xl bg-white p-4 shadow-2xl shadow-zinc-950">
                    <Image
                      src={whatsappStatus.qr}
                      alt="Código QR de WhatsApp"
                      width={180}
                      height={180}
                      className="h-44 w-44"
                      unoptimized
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card-elevated overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-900/60 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-zinc-800 px-6 py-5">
              <h2 className="font-heading text-lg font-bold text-zinc-50">
                Catálogo público
              </h2>
              <p className="text-xs text-zinc-500">
                Preferencias básicas del catálogo.
              </p>
            </div>
            <div className="space-y-1 px-4 py-4">
              <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-800/30 transition-colors">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-zinc-100">
                    Precios en bolívares
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Conversión BCV en tiempo real.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBs(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showBs ? 'bg-[var(--accent-secondary)]' : 'bg-zinc-700'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showBs ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-800/30 transition-colors">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-zinc-100">
                    Mostrar stock
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Visibilidad de unidades disponibles.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStock(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showStock ? 'bg-[var(--accent-secondary)]' : 'bg-zinc-700'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showStock ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-800/30 transition-colors">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-zinc-100">
                    Botón de WhatsApp
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Chat flotante en el catálogo.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChatButton(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showChatButton ? 'bg-[var(--accent-secondary)]' : 'bg-zinc-700'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showChatButton ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
