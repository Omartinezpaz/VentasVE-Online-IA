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

      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-6">
          {/* TIPO DE NEGOCIO */}
          <div className="card-elevated overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-xl">
            <div className="border-b border-[var(--border)] px-6 py-5">
              <h2 className="font-heading text-lg font-bold text-[var(--foreground)]">
                🏪 Tipo de Negocio
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Define tu ramo para activar funciones específicas.
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[
                  { id: 'FASHION', name: 'Moda y Ropa', icon: '👗' },
                  { id: 'FOOD', name: 'Comida', icon: '🍔' },
                  { id: 'BEAUTY', name: 'Belleza', icon: '💄' },
                  { id: 'TECH', name: 'Tecnología', icon: '📱' },
                  { id: 'GROCERY', name: 'Abastos', icon: '🛒' },
                  { id: 'HOME', name: 'Hogar', icon: '🏠' },
                  { id: 'HEALTH', name: 'Salud', icon: '🌿' },
                  { id: 'EDUCATION', name: 'Educación', icon: '📚' },
                  { id: 'AUTO', name: 'Automotriz', icon: '🚗' },
                  { id: 'SERVICE', name: 'Servicios', icon: '🔧' },
                  { id: 'PET', name: 'Mascotas', icon: '🐾' },
                  { id: 'OTHER', name: 'Otro', icon: '⚡' },
                ].map(ramo => (
                  <button
                    key={ramo.id}
                    onClick={() => setBusiness(prev => ({ ...prev, type: ramo.id as any }))}
                    className={`p-4 rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-2 active:scale-95 ${business.type === ramo.id ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--background)]/40 hover:border-[var(--muted)]'}`}
                  >
                    <span className="text-2xl">{ramo.icon}</span>
                    <div className="text-[10px] font-bold uppercase tracking-tight text-[var(--foreground)]">{ramo.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card-elevated overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-xl">
            <div className="border-b border-[var(--border)] px-6 py-5">
              <h2 className="font-heading text-lg font-bold text-[var(--foreground)]">
                🏷️ Datos de la Tienda
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
          {/* ENVÍOS */}
          <div className="card-elevated overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-xl">
            <div className="border-b border-[var(--border)] px-6 py-5">
              <h2 className="font-heading text-lg font-bold text-[var(--foreground)]">
                🚚 Zonas de Envío
              </h2>
            </div>
            <div className="p-6 space-y-4">
               {[
                 { name: 'Caracas (mismo día)', price: '$2.00', free: '>$20' },
                 { name: 'Interior del país', price: '$6.00', free: 'MRW/Zoom' }
               ].map(zone => (
                 <div key={zone.name} className="flex items-center justify-between p-4 rounded-xl bg-[var(--background)]/40 border border-[var(--border)]">
                    <div className="flex-1">
                        <div className="text-sm font-bold text-[var(--foreground)]">{zone.name}</div>
                        <div className="text-[10px] font-bold text-emerald-500 uppercase">Envío: {zone.price} · {zone.free}</div>
                    </div>
                    <button className="text-[10px] font-bold text-[var(--accent)] border border-[var(--accent)]/30 px-3 py-1.5 rounded-lg uppercase">Editar</button>
                 </div>
               ))}
               <button className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-xs font-bold text-[var(--muted)] uppercase hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
                 + Agregar nueva zona
               </button>
            </div>
          </div>

          {/* CHATBOT FLOW BUILDER */}
          <div className="card-elevated overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-xl">
            <div className="border-b border-[var(--border)] px-6 py-5 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-[var(--foreground)]">
                🤖 Flujo de ChatBot
              </h2>
              <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">Activo</span>
            </div>
            <div className="p-6 space-y-3">
               {[
                 { step: 1, title: 'Saludo y menú', type: 'MENÚ', color: 'bg-purple-500' },
                 { step: 2, title: 'Enviar link catálogo', type: 'AUTO', color: 'bg-blue-500' },
                 { step: 3, title: 'Capturar pedido', type: 'MSJ', color: 'bg-emerald-500' },
               ].map(flow => (
                 <div key={flow.step} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--background)]/40 border border-[var(--border)] cursor-grab active:cursor-grabbing">
                    <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center font-heading font-black text-black text-xs">{flow.step}</div>
                    <div className="flex-1 text-sm font-bold text-[var(--foreground)]">{flow.title}</div>
                    <div className={`px-2 py-1 rounded text-[9px] font-bold text-white ${flow.color}`}>{flow.type}</div>
                    <div className="text-[var(--muted)] opacity-30">⋮⋮</div>
                 </div>
               ))}
               <button className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-xs font-bold text-[var(--muted)] uppercase hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
                 + Nuevo paso
               </button>
            </div>
          </div>

          {/* MÓDULOS */}
          <div className="card-elevated overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-xl">
            <div className="border-b border-[var(--border)] px-6 py-5">
              <h2 className="font-heading text-lg font-bold text-[var(--foreground)]">
                🧩 Módulos Activos
              </h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
               {[
                 { name: 'Gestión Pedidos', plan: 'FREE', icon: '📦', active: true },
                 { name: 'Catálogo Online', plan: 'FREE', icon: '🛍️', active: true },
                 { name: 'Inbox Unificado', plan: 'PRO', icon: '💬', active: true },
                 { name: 'ChatBot IA', plan: 'PRO', icon: '🤖', active: true },
                 { name: 'Reportes Pro', plan: 'BIZ', icon: '📊', active: false },
                 { name: 'Marketing', plan: 'BIZ', icon: '🎁', active: false },
               ].map(mod => (
                 <div key={mod.name} className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-3 ${mod.active ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--background)]/20 opacity-60'}`}>
                    <div className="flex justify-between items-start">
                        <span className="text-2xl">{mod.icon}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${mod.plan === 'FREE' ? 'bg-emerald-500/20 text-emerald-500' : mod.plan === 'PRO' ? 'bg-orange-500/20 text-orange-500' : 'bg-red-500/20 text-red-500'}`}>{mod.plan}</span>
                    </div>
                    <div className="text-[11px] font-bold text-[var(--foreground)] uppercase truncate">{mod.name}</div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] font-bold text-[var(--muted)] uppercase">{mod.active ? 'Activo' : 'Inactivo'}</span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${mod.active ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${mod.active ? 'right-0.5' : 'left-0.5'}`} />
                        </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>

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
                <div className="space-y-6 rounded-[28px] border-2 border-dashed border-[var(--border)] bg-[var(--background)]/20 p-8 text-center transition-all hover:border-[var(--accent)]/50">
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-[var(--foreground)] font-heading">
                      Escanea el código QR
                    </div>
                    <p className="text-[10px] text-[var(--muted)] leading-relaxed max-w-[200px] mx-auto">
                      Abre WhatsApp en tu teléfono &gt; Dispositivos vinculados &gt; Vincular un dispositivo.
                    </p>
                  </div>
                  <div className="relative mx-auto inline-block">
                    <div className="absolute -inset-4 rounded-[32px] border-2 border-dashed border-[var(--accent)]/20 animate-[spin_10s_linear_infinite]" />
                    <div className="relative rounded-2xl bg-white p-4 shadow-2xl">
                      <Image
                        src={whatsappStatus.qr}
                        alt="Código QR de WhatsApp"
                        width={180}
                        height={180}
                        className="h-40 w-40"
                        unoptimized
                      />
                    </div>
                  </div>
                  <button className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest mt-4">Actualizar QR</button>
                </div>
              )}
            </div>
          </div>

          <div className="card-elevated overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-xl">
            <div className="border-b border-[var(--border)] px-6 py-5">
              <h2 className="font-heading text-lg font-bold text-[var(--foreground)]">
                🛍️ Catálogo público
              </h2>
              <p className="text-xs text-[var(--muted)]">
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
