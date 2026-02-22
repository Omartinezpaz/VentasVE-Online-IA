'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { whatsappApi, WhatsappStatus } from '@/lib/api/whatsapp';
import { getAccessToken } from '@/lib/auth/storage';
import { settingsApi, PaymentMethods, CatalogOptions, NotificationSettings, ShippingZoneConfig, ShippingOptionsConfig } from '@/lib/api/settings';
import { geoApi, Estado, Municipio, Parroquia, Country, VeAreaCode } from '@/lib/api/geo';
import { metaApi, BankMeta, BusinessTypeMeta, PersonTypeMeta, IslrRegimenMeta } from '@/lib/api/meta';
import {
  shippingApi,
  ShippingZone as ShippingZoneAdvanced,
  CreateShippingZoneInput as CreateShippingZoneAdvancedInput,
  ApiError,
  SelectableItem,
  municipioToItem,
  parroquiaToItem,
} from '@/lib/api/shipping';
import { getCoverageShortText } from '@/lib/helpers/summarizeCoverages';
import ConfirmModal from './ConfirmModal';
import CoverageDetailPanel from './CoverageDetailPanel';
import MultiSelectModal from './MultiSelectModal';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Tab = 'negocio' | 'pagos' | 'catalogo' | 'envios' | 'chatbot' | 'modulos' | 'notificaciones' | 'plan';

type PersonaType = 'NATURAL' | 'JURIDICA';
type ISLRRegimen = string;

type BusinessProfile = 'TIENDA_FISICA' | 'TIENDA_ONLINE' | 'EMPRENDEDOR' | 'PROFESIONAL';

type SettingsFormData = {
  // Mi Negocio
  name: string;
  slug: string;
  whatsappPhone: string;
  city: string;
  instagram: string;
  schedule: string;
  description: string;
  businessType: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  businessAddress: string;
  personaType: PersonaType;
  businessProfile: BusinessProfile;
  rif: string;
  razonSocial: string;
  fiscalAddress: string;
  estadoId: number | '';
  municipioId: number | '';
  parroquiaId: number | '';
  postalCode: string;
  electronicInvoicing: boolean;
  islrRegimen: ISLRRegimen | '';
  // Pagos
  zelleEmail: string;
  zelleName: string;
  pagoMovilPhone: string;
  pagoMovilBank: string;
  pagoMovilId: string;
  binanceId: string;
  transferAccount: string;
  transferName: string;
  cashUsdExchangeRate: number | '';
  // Catálogo
  showBs: boolean;
  showStock: boolean;
  showChatButton: boolean;
  allowOrdersWithoutStock: boolean;
  showSearch: boolean;
  showStrikePrice: boolean;
  minOrderAmount: number | '';
  maxOrderAmount: number | '';
};

type ShippingZone = {
  id: string;
  name: string;
  price: number;
  free: boolean;
  estadoId?: number | '';
  municipioId?: number | '';
  parroquiaId?: number | '';
  distanceKm?: number | '';
  deliveryTime?: string;
};
type BotStep = { id: string; num: number; label: string; desc: string };
type Module = { id: string; icon: string; name: string; desc: string; plan: 'free' | 'pro' | 'biz'; enabled: boolean };

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'negocio',        label: 'Mi Negocio',      icon: '🏪' },
  { id: 'pagos',          label: 'Pagos',            icon: '💳' },
  { id: 'catalogo',       label: 'Catálogo',         icon: '🛍️' },
  { id: 'envios',         label: 'Envíos',           icon: '🚚' },
  { id: 'chatbot',        label: 'ChatBot',          icon: '🤖' },
  { id: 'modulos',        label: 'Módulos',          icon: '🧩' },
  { id: 'notificaciones', label: 'Notificaciones',   icon: '🔔' },
  { id: 'plan',           label: 'Plan',             icon: '⭐' },
];

const BUSINESS_PROFILES: { id: BusinessProfile; label: string; description: string }[] = [
  { id: 'TIENDA_FISICA',   label: 'Tienda física (formal)',   description: 'Requiere RIF, razón social y dirección fiscal completa.' },
  { id: 'TIENDA_ONLINE',   label: 'Tienda online (formal)',   description: 'Requiere datos fiscales para facturación electrónica o formal.' },
  { id: 'EMPRENDEDOR',     label: 'Emprendedor (informal)',   description: 'RIF y dirección fiscal opcionales pero recomendados para crecer.' },
  { id: 'PROFESIONAL',     label: 'Profesional independiente', description: 'RIF opcional, recomendable si emites facturas por honorarios.' },
];

const DEFAULT_ZONES: ShippingZone[] = [
  { id: '1', name: 'Caracas (zona 1)', price: 0,  free: true  },
  { id: '2', name: 'Interior del país', price: 8,  free: false },
  { id: '3', name: 'Internacional',     price: 20, free: false },
];

const DEFAULT_STEPS: BotStep[] = [
  { id: 'b1', num: 1, label: 'Saludo inicial',      desc: 'Hola! Bienvenido a {nombre_tienda} 👋' },
  { id: 'b2', num: 2, label: 'Menú principal',      desc: '¿Qué deseas hacer? 1) Ver catálogo 2) Estado pedido 3) Hablar con un asesor' },
  { id: 'b3', num: 3, label: 'Ver catálogo',        desc: 'Aquí está nuestro catálogo: {link_catalogo}' },
  { id: 'b4', num: 4, label: 'Consultar pedido',    desc: 'Indícame tu número de pedido o nombre para buscarlo.' },
  { id: 'b5', num: 5, label: 'Escalar a humano',    desc: 'Te conecto con un asesor. Espera un momento 🙏' },
];

const DEFAULT_MODULES: Module[] = [
  { id: 'm1', icon: '🤖', name: 'ChatBot IA',         desc: 'Responde automáticamente por WhatsApp',      plan: 'pro',  enabled: true  },
  { id: 'm2', icon: '💬', name: 'Inbox Unificado',    desc: 'WA + IG + Web en un solo panel',             plan: 'pro',  enabled: true  },
  { id: 'm3', icon: '🎟️', name: 'Cupones y Descuentos', desc: 'Códigos promocionales para tus clientes',  plan: 'biz',  enabled: false },
  { id: 'm4', icon: '📊', name: 'Analytics Pro',      desc: 'Reportes avanzados de ventas',               plan: 'biz',  enabled: false },
  { id: 'm5', icon: '🏢', name: 'Multi-sucursal',     desc: 'Gestiona varias ubicaciones',                plan: 'biz',  enabled: false },
  { id: 'm6', icon: '🔌', name: 'API & Webhooks',     desc: 'Integra con sistemas externos',              plan: 'biz',  enabled: false },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const apiBaseUrl = new URL(API_BASE);
const IMAGE_BASE_ORIGIN = `${apiBaseUrl.protocol}//${apiBaseUrl.host}`;

const resolveImageUrl = (src: string) => {
  if (!src) return src;
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:') || src.startsWith('data:')) {
    return src;
  }
  if (!src.startsWith('/')) return src;
  return `${IMAGE_BASE_ORIGIN}${src}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// SMALL REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Card wrapper
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, icon, action }: {
  title: string; subtitle?: string; icon?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5c842]/10 text-base">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
          {subtitle && <p className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// Form field wrapper
function Field({ label, error, hint, children, full = false }: {
  label: string; error?: string; hint?: string; children: React.ReactNode; full?: boolean;
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--foreground2)]">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-[10px] text-zinc-600">{hint}</p>}
      {error && <p className="mt-1 text-[10px] text-red-400 flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}

const iCls = 'w-full rounded-xl border border-[var(--border2)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10';
const iErrCls = 'w-full rounded-xl border border-red-500/60 bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-red-400 focus:ring-2 focus:ring-red-400/10';

// Toggle switch
function Toggle({ checked, onChange, accent = false }: { checked: boolean; onChange: (v: boolean) => void; accent?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#f5c842]/30 ${
        checked ? (accent ? 'bg-[#f5c842]' : 'bg-emerald-500') : 'bg-zinc-700'
      }`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

// Toggle row
function ToggleRow({ title, desc, checked, onChange }: {
  title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-zinc-800/60 last:border-0">
      <div>
        <div className="text-sm font-medium text-zinc-100">{title}</div>
        {desc && <div className="text-[11px] text-zinc-500 mt-0.5">{desc}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// Plan badge
function PlanBadge({ plan }: { plan: 'free' | 'pro' | 'biz' }) {
  const styles = {
    free: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pro:  'bg-[#f5c842]/10 text-[#f5c842] border-[#f5c842]/20',
    biz:  'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const labels = { free: 'Gratis', pro: 'Pro', biz: 'Business' };
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${styles[plan]}`}>
      {labels[plan]}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGO UPLOAD
// ─────────────────────────────────────────────────────────────────────────────
function LogoUpload({ preview, onPreviewChange }: { preview: string | null; onPreviewChange: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { alert('Máximo 5MB'); return; }

    const reader = new FileReader();
    reader.onload = e => onPreviewChange(e.target?.result as string);
    reader.readAsDataURL(file);

    settingsApi.uploadLogo(file)
      .then(res => {
        onPreviewChange(res.data.logoUrl);
      })
      .catch(() => {
        alert('No se pudo subir el logo. Intenta de nuevo.');
      });
  }, [onPreviewChange]);

  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Logo de la tienda</label>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 transition-all ${
          dragOver ? 'border-[#f5c842] bg-[#f5c842]/5' : 'border-zinc-700 hover:border-zinc-500'
        }`}
      >
        {preview ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-xl overflow-hidden border border-zinc-700">
              <Image src={resolveImageUrl(preview)} alt="Logo" width={56} height={56} className="h-full w-full object-cover" unoptimized />
            </div>
            <span className="text-[10px] text-zinc-500">Clic para cambiar</span>
          </div>
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-xl">🖼️</div>
            <div className="text-center">
              <p className="text-xs font-semibold text-zinc-300">Arrastra tu logo</p>
              <p className="text-[10px] text-zinc-600">PNG · JPG · WEBP · Máx 5MB</p>
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      {preview && (
        <button type="button" onClick={() => onPreviewChange(null)}
          className="mt-1.5 text-[10px] text-red-400 hover:text-red-300 transition">
          ✕ Quitar logo
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE PREVIEW
// ─────────────────────────────────────────────────────────────────────────────
function LivePreview({ data, logo }: { data: Partial<SettingsFormData>; logo: string | null }) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-950 overflow-hidden shadow-2xl text-[12px]">
      {/* browser chrome */}
      <div className="flex items-center gap-2 bg-zinc-900 px-3 py-2 border-b border-zinc-800">
        <div className="flex gap-1">
          {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} className="h-2 w-2 rounded-full" style={{ background: c }} />)}
        </div>
        <div className="flex-1 rounded bg-zinc-800 px-2 py-0.5 text-center text-zinc-500 truncate">
          ventasve.app/c/{data.slug || 'tutienda'}
        </div>
      </div>
      {/* hero */}
      <div className="bg-zinc-900 px-4 py-3 flex items-center gap-2.5">
        <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden border border-zinc-700 bg-gradient-to-br from-orange-500 to-yellow-400 flex items-center justify-center text-lg">
          {logo ? (
            <Image src={resolveImageUrl(logo)} alt="" width={40} height={40} className="h-full w-full object-cover" unoptimized />
          ) : (
            '🛍️'
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white truncate text-base">{data.name || 'Nombre de tu tienda'}</p>
          <p className="text-zinc-400 truncate text-sm">{data.instagram || '@tutienda'}</p>
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {data.city && <span className="rounded bg-zinc-800 px-1.5 text-zinc-400">📍{data.city}</span>}
            {data.schedule && <span className="rounded bg-zinc-800 px-1.5 text-zinc-400">🕐{data.schedule}</span>}
          </div>
        </div>
      </div>
      {/* description */}
      {data.description && (
        <div className="px-4 py-2 border-t border-zinc-800 text-zinc-500 line-clamp-2">{data.description}</div>
      )}
      {/* catalog flags */}
      <div className="flex gap-1.5 px-4 py-2 border-t border-zinc-800 flex-wrap">
        {data.showBs && <span className="rounded bg-blue-900/40 text-blue-400 border border-blue-800/40 px-1.5">Bs.</span>}
        {data.showStock && <span className="rounded bg-emerald-900/40 text-emerald-400 border border-emerald-800/40 px-1.5">Stock</span>}
        {data.showChatButton && <span className="rounded bg-emerald-900/40 text-emerald-400 border border-emerald-800/40 px-1.5">💬 Chat</span>}
      </div>
      {/* mini products */}
      <div className="grid grid-cols-3 gap-1.5 p-3 bg-zinc-950 border-t border-zinc-800">
        {['👕', '👟', '👜'].map((e, i) => (
          <div key={i} className="rounded-lg bg-zinc-900 p-2 text-center border border-zinc-800">
            <div className="text-lg mb-0.5">{e}</div>
            <div className="text-zinc-500">Producto</div>
            <div className="font-bold text-[#f5c842]">$12</div>
            {data.showBs && <div className="text-zinc-600">Bs. 438K</div>}
            {data.showStock && <div className="text-emerald-500">✓ 10</div>}
          </div>
        ))}
      </div>
      {/* wa float */}
      {data.showChatButton && (
        <div className="relative h-5 bg-zinc-950">
          <div className="absolute right-3 -top-3 h-6 w-6 rounded-full bg-[#25d366] flex items-center justify-center shadow text-xs">💬</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────
const validators = {
  name:            (v: string) => { if (!v || v.length < 2) return 'Mínimo 2 caracteres'; if (v.length > 60) return 'Máximo 60 caracteres'; },
  slug:            (v: string) => { if (!v || v.length < 3) return 'Mínimo 3 caracteres'; if (!/^[a-z0-9-]+$/.test(v)) return 'Solo minúsculas, números y guiones'; },
  whatsappPhone:   (v: string) => {
    if (!v) return 'Teléfono inválido';
    if (!/^\+\d{1,3}(?:[ -]?\d){6,14}$/.test(v)) return 'Incluye código de país, ej: +58 412-1234567';
  },
  city:            (v: string) => { if (!v) return 'Selecciona una ciudad'; },
  businessType:    (v: string) => { if (!v) return 'Selecciona un tipo'; },
  description:     (v: string) => { if (v?.length > 500) return 'Máximo 500 caracteres'; },
  ownerEmail:      (v: string) => { if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email inválido'; },
  ownerPhone:      (v: string) => {
    if (v && !/^\+\d{1,3}(?:[ -]?\d){6,14}$/.test(v)) return 'Incluye código de país, ej: +58 412-1234567';
  },
  businessAddress: (v: string) => {
    if (v && v.length < 10) return 'Mínimo 10 caracteres';
    if (v && v.length > 500) return 'Máximo 500 caracteres';
  },
  rif:             (v: string) => {
    if (v && !/^[JVE]-\d{8,9}-\d$/.test(v)) return 'Formato inválido. Debe ser: J-12345678-9';
  },
  fiscalAddress:   (v: string) => {
    if (v && v.length < 10) return 'Dirección fiscal muy corta';
    if (v && v.length > 500) return 'Dirección fiscal muy larga';
  },
  estadoId:        (v: number | '') => { if (!v) return 'Requerido'; },
  municipioId:     (v: number | '') => { if (!v) return 'Requerido'; },
  zelleEmail:      (v: string) => { if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email inválido'; },
  cashRate:        (v: number | '') => { if (v !== '' && Number(v) <= 0) return 'Debe ser positivo'; },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]                   = useState<Tab>('negocio');
  const [loading, setLoading]                       = useState(true);
  const [saving, setSaving]                         = useState(false);
  const [saveError, setSaveError]                   = useState<string | null>(null);
  const [savedOk, setSavedOk]                       = useState(false);
  const [logoPreview, setLogoPreview]               = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus]         = useState<WhatsappStatus | null>(null);
  const [waLoading, setWaLoading]                   = useState(false);
  const [waError, setWaError]                       = useState<string | null>(null);
  const [notifSettings, setNotifSettings]           = useState<NotificationSettings>({});
  const [zones, setZones]                           = useState<ShippingZone[]>(DEFAULT_ZONES);
  const [shippingZones, setShippingZones]           = useState<ShippingZoneAdvanced[]>([]);
  const [shippingLoading, setShippingLoading]       = useState(false);
  const [shippingError, setShippingError]           = useState<string | null>(null);
  const [botSteps, setBotSteps]                     = useState<BotStep[]>(DEFAULT_STEPS);
  const [modules, setModules]                       = useState<Module[]>(DEFAULT_MODULES);
  const [botName, setBotName]                       = useState('Valeria');
  const [botTone, setBotTone]                       = useState('Amigable');
  const [outOfHours, setOutOfHours]                 = useState(true);
  const [escalate, setEscalate]                     = useState(true);
  const [quickReplies, setQuickReplies]             = useState(true);
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false);
  const [freeShippingMin, setFreeShippingMin]       = useState<number | ''>('');
  const [pickupEnabled, setPickupEnabled]           = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [parroquias, setParroquias] = useState<Parroquia[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [veAreaCodes, setVeAreaCodes] = useState<VeAreaCode[]>([]);
  const [banks, setBanks] = useState<BankMeta[]>([]);
  const [bizTypes, setBizTypes] = useState<BusinessTypeMeta[]>([]);
   const [personTypes, setPersonTypes] = useState<PersonTypeMeta[]>([]);
   const [islrRegimens, setIslrRegimens] = useState<IslrRegimenMeta[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [catalogsError, setCatalogsError] = useState<string | null>(null);
  const [municipiosByEstado, setMunicipiosByEstado] = useState<Record<number, Municipio[]>>({});
  const [parroquiasByMunicipio, setParroquiasByMunicipio] = useState<Record<number, Parroquia[]>>({});
  const [coverageZone, setCoverageZone] = useState<ShippingZoneAdvanced | null>(null);
  const [coverageMode, setCoverageMode] = useState<'estado' | 'municipio' | 'parroquia'>('estado');
  const [coverageBaseEstadoId, setCoverageBaseEstadoId] = useState<number | null>(null);
  const [coverageBaseMunicipioId, setCoverageBaseMunicipioId] = useState<number | null>(null);
  const [coverageSelectedIds, setCoverageSelectedIds] = useState<number[]>([]);
  const [coverageMunicipios, setCoverageMunicipios] = useState<Municipio[]>([]);
  const [coverageParroquias, setCoverageParroquias] = useState<Parroquia[]>([]);

  const enrichZoneCoverages = (zone: ShippingZoneAdvanced): ShippingZoneAdvanced => {
    if (!zone.coverages || zone.coverages.length === 0) return zone;
    if (!estados || estados.length === 0) return zone;
    const enrichedCoverages = zone.coverages.map(cov => {
      const estadoNombre =
        cov.estadoNombre ??
        estados.find(e => e.id === cov.estadoId)?.nombre_estado;
      return {
        ...cov,
        estadoNombre: estadoNombre ?? 'Desconocido',
      };
    });
    return { ...zone, coverages: enrichedCoverages };
  };

  const {
    register, handleSubmit, control, watch, reset, setError,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<SettingsFormData>({
    defaultValues: {
      name: '', slug: '', whatsappPhone: '', city: '', instagram: '', schedule: '',
      description: '', businessType: '', ownerName: '', ownerPhone: '', ownerEmail: '', businessAddress: '',
      personaType: 'NATURAL', businessProfile: 'TIENDA_FISICA',
      rif: '', razonSocial: '', fiscalAddress: '',
      estadoId: '', municipioId: '', parroquiaId: '',
      postalCode: '', electronicInvoicing: false, islrRegimen: '',
      zelleEmail: '', zelleName: '',
      pagoMovilPhone: '', pagoMovilBank: '', pagoMovilId: '', binanceId: '',
      transferAccount: '', transferName: '', cashUsdExchangeRate: '',
      showBs: true, showStock: false, showChatButton: true,
      allowOrdersWithoutStock: false, showSearch: true, showStrikePrice: false,
      minOrderAmount: '', maxOrderAmount: '',
    },
  });

  const estadoWatch = watch('estadoId');
  const municipioWatch = watch('municipioId');
  const watchedValues = watch();
  const dirtyCount = Object.keys(dirtyFields).length;

  // ── Load settings ────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace('/auth/login'); return; }
    const load = async () => {
      setLoading(true);
      try {
        const res = await settingsApi.get();
        const d = res.data;
        const pm: PaymentMethods = d.paymentMethods ?? {};
        const co: CatalogOptions = d.catalogOptions ?? {};
        const sz: ShippingZoneConfig[] = d.shippingZones ?? [];
        const so: ShippingOptionsConfig = d.shippingOptions ?? {};
        reset({
          name: d.name ?? '', slug: d.slug ?? '', whatsappPhone: d.whatsappPhone ?? '',
          city: d.city ?? '', instagram: d.instagram ?? '', schedule: d.schedule ?? '',
          description: d.description ?? '', businessType: d.businessType ?? '',
          ownerName: d.ownerName ?? '', ownerPhone: d.ownerPhone ?? '', ownerEmail: d.ownerEmail ?? '',
          businessAddress: d.businessAddress ?? '',
          personaType: d.personaType ? (String(d.personaType).toUpperCase() as PersonaType) : 'NATURAL',
          businessProfile: (d.businessProfile as BusinessProfile) ?? 'TIENDA_FISICA',
          rif: d.rif ?? '', razonSocial: d.razonSocial ?? '', fiscalAddress: d.fiscalAddress ?? '',
          estadoId: d.estadoId ?? '',
          municipioId: d.municipioId ?? '',
          parroquiaId: d.parroquiaId ?? '',
          postalCode: d.postalCode ?? '',
          electronicInvoicing: d.electronicInvoicing ?? false,
          islrRegimen: d.islrRegimen ? (String(d.islrRegimen).toUpperCase() as ISLRRegimen) : '',
          zelleEmail: pm.zelle?.email ?? '', zelleName: pm.zelle?.name ?? '',
          pagoMovilPhone: pm.pagoMovil?.phone ?? '', pagoMovilBank: pm.pagoMovil?.bank ?? '',
          pagoMovilId: pm.pagoMovil?.id ?? '', binanceId: pm.binance?.id ?? '',
          transferAccount: pm.transfer?.account ?? '', transferName: pm.transfer?.name ?? '',
          cashUsdExchangeRate: d.cashUsdExchangeRate ?? '',
          showBs: co.showBs ?? true, showStock: co.showStock ?? false,
          showChatButton: co.showChatButton ?? true,
          allowOrdersWithoutStock: co.allowOrdersWithoutStock ?? false,
          showSearch: co.showSearch ?? true, showStrikePrice: co.showStrikePrice ?? false,
          minOrderAmount: co.minOrderAmount ?? '', maxOrderAmount: co.maxOrderAmount ?? '',
        });
        setLogoPreview(d.logoUrl ?? null);
        setNotifSettings(d.notificationSettings ?? {});
        setZones(
          sz.length
            ? sz.map((z, index) => ({
                id: z.id || String(index + 1),
                name: z.name,
                price: z.price,
                free: z.free,
                distanceKm: typeof z.distanceKm === 'number' ? z.distanceKm : '',
                deliveryTime: z.deliveryTime ?? '',
                estadoId: z.estadoId ?? '',
                municipioId: z.municipioId ?? '',
                parroquiaId: z.parroquiaId ?? ''
              }))
            : DEFAULT_ZONES
        );
        setFreeShippingEnabled(Boolean(so.freeShippingEnabled));
        setFreeShippingMin(
          typeof so.freeShippingMin === 'number' && Number.isFinite(so.freeShippingMin)
            ? so.freeShippingMin
            : ''
        );
        setPickupEnabled(Boolean(so.pickupEnabled));
        setCatalogsLoading(true);
        setCatalogsError(null);
        const [
          estadosRes,
          countriesRes,
          veAreaCodesRes,
          banksRes,
          typesRes,
          personTypesRes,
          islrRes
        ] = await Promise.all([
          geoApi.getEstados(),
          geoApi.getCountries(),
          geoApi.getVeAreaCodes(),
          metaApi.getBanks(),
          metaApi.getBusinessTypes(),
          metaApi.getPersonTypes(),
          metaApi.getIslrRegimens()
        ]);
        setEstados(estadosRes.data);
        setCountries(countriesRes.data);
        setVeAreaCodes(veAreaCodesRes.data);
        setBanks(banksRes.data);
        setBizTypes(typesRes.data);
        setPersonTypes(personTypesRes.data);
        setIslrRegimens(islrRes.data);
      } catch { /* silent — form keeps defaults */ }
      finally { setCatalogsLoading(false); setLoading(false); }
    };
    load();
  }, [router, reset]);

  useEffect(() => {
    if (activeTab !== 'envios') return;
    const loadShippingZones = async () => {
      setShippingLoading(true);
      setShippingError(null);
      try {
        const res = await shippingApi.getZones();
        setShippingZones(res.data.zones.map(z => enrichZoneCoverages(z)));
      } catch (err) {
        console.error('[SettingsPage] Error loading shipping zones:', err);
        setShippingError('No se pudieron cargar las zonas de envío');
      } finally {
        setShippingLoading(false);
      }
    };
    loadShippingZones();
  }, [activeTab]);

  

  useEffect(() => {
    const id = estadoWatch;
    if (id) {
      geoApi.getMunicipios(Number(id)).then(res => {
        setMunicipios(res.data);
        setParroquias([]);
      });
    } else {
      setMunicipios([]);
      setParroquias([]);
    }
  }, [estadoWatch]);

  useEffect(() => {
    const id = municipioWatch;
    if (id) {
      geoApi.getParroquias(Number(id)).then(res => {
        setParroquias(res.data);
      });
    } else {
      setParroquias([]);
    }
  }, [municipioWatch]);

  useEffect(() => {
    const estadosIds = Array.from(
      new Set(
        zones
          .map(z => (typeof z.estadoId === 'number' ? z.estadoId : null))
          .filter((v): v is number => v !== null)
      )
    );
    estadosIds.forEach(id => {
      if (!municipiosByEstado[id]) {
        geoApi.getMunicipios(id).then(res => {
          setMunicipiosByEstado(prev => ({
            ...prev,
            [id]: res.data
          }));
        });
      }
    });
  }, [zones, municipiosByEstado]);

  useEffect(() => {
    const municipiosIds = Array.from(
      new Set(
        zones
          .map(z => (typeof z.municipioId === 'number' ? z.municipioId : null))
          .filter((v): v is number => v !== null)
      )
    );
    municipiosIds.forEach(id => {
      if (!parroquiasByMunicipio[id]) {
        geoApi.getParroquias(id).then(res => {
          setParroquiasByMunicipio(prev => ({
            ...prev,
            [id]: res.data
          }));
        });
      }
    });
  }, [zones, parroquiasByMunicipio]);

  // ── Load WhatsApp ────────────────────────────────────────────────────────
  const refreshWhatsappStatus = useCallback(async () => {
    setWaLoading(true);
    setWaError(null);
    try {
      const response = await whatsappApi.getStatus();
      setWhatsappStatus(response.data);
    } catch {
      setWaError('No se pudo obtener el estado de WhatsApp');
    } finally {
      setWaLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWhatsappStatus();
  }, [refreshWhatsappStatus]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const onSubmit = async (values: SettingsFormData) => {
    setSaving(true);
    setSaveError(null);
    setSavedOk(false);
    try {
      const minOrder = values.minOrderAmount === '' ? undefined : Number(values.minOrderAmount);
      const maxOrder = values.maxOrderAmount === '' ? undefined : Number(values.maxOrderAmount);
      const payload = {
        name: values.name, slug: values.slug, whatsappPhone: values.whatsappPhone,
        city: values.city, instagram: values.instagram, schedule: values.schedule,
        description: values.description, businessType: values.businessType || undefined,
        ownerName: values.ownerName || undefined,
        ownerPhone: values.ownerPhone || undefined,
        ownerEmail: values.ownerEmail || undefined,
        businessAddress: values.businessAddress || undefined,
        personaType: values.personaType || undefined,
        businessProfile: values.businessProfile || undefined,
        rif: values.rif || undefined,
        razonSocial: values.razonSocial || undefined,
        fiscalAddress: values.fiscalAddress || undefined,
        estadoId: values.estadoId === '' ? undefined : Number(values.estadoId),
        municipioId: values.municipioId === '' ? undefined : Number(values.municipioId),
        parroquiaId: values.parroquiaId === '' ? undefined : Number(values.parroquiaId),
        postalCode: values.postalCode || undefined,
        electronicInvoicing: values.electronicInvoicing || undefined,
        islrRegimen: values.islrRegimen || undefined,
        cashUsdExchangeRate: values.cashUsdExchangeRate || undefined,
        paymentMethods: {
          zelle:    { email: values.zelleEmail ? values.zelleEmail.trim() : undefined, name: values.zelleName },
          pagoMovil:{ phone: values.pagoMovilPhone, bank: values.pagoMovilBank, id: values.pagoMovilId },
          binance:  { id: values.binanceId },
          transfer: { account: values.transferAccount, name: values.transferName },
        },
        catalogOptions: {
          showBs: values.showBs,
          showStock: values.showStock,
          showChatButton: values.showChatButton,
          allowOrdersWithoutStock: values.allowOrdersWithoutStock,
          showSearch: values.showSearch,
          showStrikePrice: values.showStrikePrice,
          minOrderAmount: Number.isNaN(minOrder as number) ? undefined : minOrder,
          maxOrderAmount: Number.isNaN(maxOrder as number) ? undefined : maxOrder,
        },
        notificationSettings: notifSettings,
        shippingZones: zones.map(z => {
          const distance =
            z.distanceKm === '' || z.distanceKm === undefined
              ? undefined
              : Number(z.distanceKm);
          const estadoId =
            z.estadoId === '' || z.estadoId === undefined
              ? undefined
              : Number(z.estadoId);
          const municipioId =
            z.municipioId === '' || z.municipioId === undefined
              ? undefined
              : Number(z.municipioId);
          const parroquiaId =
            z.parroquiaId === '' || z.parroquiaId === undefined
              ? undefined
              : Number(z.parroquiaId);
          const baseSlug =
            z.name
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || z.id;
          return {
            id: z.id,
            slug: baseSlug,
            name: z.name,
            price: z.price,
            free: z.free,
            distanceKm: Number.isNaN(distance as number) ? undefined : distance,
            deliveryTime: z.deliveryTime || undefined,
            estadoId: Number.isNaN(estadoId as number) ? undefined : estadoId,
            municipioId: Number.isNaN(municipioId as number) ? undefined : municipioId,
            parroquiaId: Number.isNaN(parroquiaId as number) ? undefined : parroquiaId
          };
        }),
        shippingOptions: {
          freeShippingEnabled,
          freeShippingMin:
            freeShippingMin === '' || freeShippingMin === undefined
              ? undefined
              : Number(freeShippingMin),
          pickupEnabled
        },
      };

      console.log('[settings][SUBMIT_PAYLOAD]', payload);

      const res = await settingsApi.update(payload);
      if (res && res.status >= 200 && res.status < 300) {
        setSavedOk(true);
      }
      reset(values); // limpia isDirty
      setTimeout(() => setSavedOk(false), 3000);
    } catch (err) {
      type ApiErrorResponse = { status?: number; data?: { code?: string; error?: string; field?: string; details?: unknown; requestId?: string } };
      const anyErr = err as { response?: ApiErrorResponse };
      const resp = anyErr.response;
      const code = resp?.data?.code as string | undefined;
      console.error('[settings][ERROR_RESPONSE]', resp);
      if (resp?.status === 400 && code === 'VALIDATION_FAILED' && Array.isArray(resp.data?.details as unknown[])) {
        const issues = resp.data!.details as Array<{ path: Array<string | number>; message: string }>;
        const msgs: string[] = [];
        for (const issue of issues) {
          const path = issue.path ?? [];
          let fieldName: keyof SettingsFormData | undefined;
          if (path[0] === 'paymentMethods' && path[1] === 'zelle' && path[2] === 'email') {
            fieldName = 'zelleEmail';
          }
          let label = '';
          if (fieldName === 'zelleEmail') {
            label = 'Correo de Zelle';
          } else if (typeof path[0] === 'string') {
            label = path[0];
          }
          const message = fieldName === 'zelleEmail'
            ? 'Correo inválido. Ejemplo: usuario@correo.com'
            : issue.message;
          if (fieldName) {
            try { setError(fieldName, { type: 'server', message }); } catch {}
          }
          msgs.push(`${label ? label + ': ' : ''}${message}`);
        }
        setSaveError(`Corrige los siguientes campos:\n- ${msgs.join('\n- ')}`);
      } else if ((resp?.status === 400 || resp?.status === 422) && (code === 'VALIDATION_ERROR' || code === 'VALIDATION_FAILED')) {
        // AppError con campo específico
        const msg = resp.data?.error || 'Error de validación';
        const field = resp.data?.field as string | undefined;
        if (field) {
          try { setError(field as keyof SettingsFormData, { type: 'server', message: msg }); } catch {}
          setSaveError(`Corrige el campo "${field}": ${msg}`);
        } else {
          setSaveError(msg);
        }
      } else if (resp?.status === 401 && resp?.data?.code === 'TOKEN_EXPIRED') {
        setSaveError('Sesión expirada. Inicia sesión nuevamente e intenta guardar.');
      } else {
        const generic = resp?.data?.error || 'No se pudieron guardar los cambios. Intenta de nuevo.';
        const requestId = resp?.data?.requestId;
        const suffix = requestId ? ` (ID: ${requestId})` : '';
        setSaveError(`${generic}${suffix}`);
      }
    } finally { setSaving(false); }
  };

  const handleWhatsappConnect = useCallback(async () => {
    setWaLoading(true);
    setWaError(null);
    try {
      await whatsappApi.connect();
      let attempts = 0;
      const maxAttempts = 30;
      const interval = setInterval(async () => {
        attempts += 1;
        try {
          const response = await whatsappApi.getStatus();
          setWhatsappStatus(response.data);
          if (response.data.connected || response.data.qr || attempts >= maxAttempts) {
            clearInterval(interval);
            setWaLoading(false);
          }
        } catch {
          clearInterval(interval);
          setWaLoading(false);
          setWaError('No se pudo obtener el QR de WhatsApp');
        }
      }, 2000);
    } catch (error: any) {
      setWaLoading(false);
      const code = error?.response?.data?.code;
      if (code === 'WHATSAPP_PHONE_REQUIRED') {
        setWaError('Configura tu número de WhatsApp en la pestaña "Mi negocio"');
      } else {
        setWaError('No se pudo iniciar la conexión con WhatsApp');
      }
    }
  }, []);

  const handleWhatsappDisconnect = useCallback(async () => {
    setWaLoading(true);
    setWaError(null);
    try {
      await whatsappApi.disconnect();
      await refreshWhatsappStatus();
    } catch {
      setWaError('No se pudo desconectar WhatsApp');
    } finally {
      setWaLoading(false);
    }
  }, [refreshWhatsappStatus]);

  const handleNotif = (ch: string, ev: string, val: boolean) =>
    setNotifSettings(p => ({ ...p, [ch]: { ...(p[ch] ?? {}), [ev]: val } }));

  const toggleModule = (id: string) =>
    setModules(p => p.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));

  const [zonePendingDelete, setZonePendingDelete] = useState<ShippingZoneAdvanced | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getCoverageItems = (): SelectableItem[] => {
    if (!coverageZone) return [];
    if (coverageMode === 'estado') {
      return estados.map(e => ({
        id: e.id,
        nombre: e.nombre_estado,
        codigo: e.codigo,
      }));
    }
    if (coverageMode === 'municipio') {
      return coverageMunicipios.map(municipioToItem);
    }
    if (coverageMode === 'parroquia') {
      return coverageParroquias.map(parroquiaToItem);
    }
    return [];
  };

  const loadCoverageMunicipios = async (zone: ShippingZoneAdvanced, estadoId: number) => {
    setCoverageBaseEstadoId(estadoId);
    try {
      const res = await geoApi.getMunicipios(estadoId);
      setCoverageMunicipios(res.data);
    } catch {
      setCoverageMunicipios([]);
    }
    const selectedMunicipios = (zone.coverages || [])
      .filter(
        c =>
          c.estadoId === estadoId &&
          typeof c.municipioId === 'number' &&
          (c.parroquiaId == null || c.parroquiaId === undefined)
      )
      .map(c => c.municipioId as number);
    setCoverageSelectedIds(selectedMunicipios);
  };

  const loadCoverageParroquias = async (
    zone: ShippingZoneAdvanced,
    estadoId: number,
    municipioId: number
  ) => {
    setCoverageBaseEstadoId(estadoId);
    setCoverageBaseMunicipioId(municipioId);
    try {
      const res = await geoApi.getParroquias(municipioId);
      setCoverageParroquias(res.data);
    } catch {
      setCoverageParroquias([]);
    }
    const selectedParroquias = (zone.coverages || [])
      .filter(
        c =>
          c.estadoId === estadoId &&
          c.municipioId === municipioId &&
          typeof c.parroquiaId === 'number'
      )
      .map(c => c.parroquiaId as number);
    setCoverageSelectedIds(selectedParroquias);
  };

  const openCoverageEditor = async (
    zone: ShippingZoneAdvanced,
    mode: 'estado' | 'municipio' | 'parroquia'
  ) => {
    setCoverageZone(zone);
    setCoverageMode(mode);
    setCoverageSelectedIds([]);
    setCoverageBaseEstadoId(null);
    setCoverageBaseMunicipioId(null);
    if (mode === 'estado') {
      const estadosIds = Array.from(
        new Set(
          (zone.coverages || [])
            .map(c => c.estadoId)
            .filter((v): v is number => typeof v === 'number')
        )
      );
      setCoverageSelectedIds(estadosIds);
      return;
    }
    if (mode === 'municipio') {
      const firstWithEstado = (zone.coverages || []).find(c => typeof c.estadoId === 'number');
      if (!firstWithEstado || typeof firstWithEstado.estadoId !== 'number') {
        setShippingError('Primero define al menos un estado para esta zona');
        setCoverageZone(null);
        return;
      }
      const estadoId = firstWithEstado.estadoId;
      setCoverageBaseEstadoId(estadoId);
      try {
        const res = await geoApi.getMunicipios(estadoId);
        setCoverageMunicipios(res.data);
      } catch {
        setCoverageMunicipios([]);
      }
      const selectedMunicipios = (zone.coverages || [])
        .filter(
          c =>
            c.estadoId === estadoId &&
            typeof c.municipioId === 'number' &&
            (c.parroquiaId == null || c.parroquiaId === undefined)
        )
        .map(c => c.municipioId as number);
      setCoverageSelectedIds(selectedMunicipios);
      return;
    }
    const firstWithMunicipio = (zone.coverages || []).find(
      c => typeof c.estadoId === 'number' && typeof c.municipioId === 'number'
    );
    if (!firstWithMunicipio || typeof firstWithMunicipio.estadoId !== 'number' || typeof firstWithMunicipio.municipioId !== 'number') {
      setShippingError('Primero define al menos un municipio para esta zona');
      setCoverageZone(null);
      return;
    }
    const estadoId = firstWithMunicipio.estadoId;
    const municipioId = firstWithMunicipio.municipioId;
    setCoverageBaseEstadoId(estadoId);
    setCoverageBaseMunicipioId(municipioId);
    try {
      const res = await geoApi.getParroquias(municipioId);
      setCoverageParroquias(res.data);
    } catch {
      setCoverageParroquias([]);
    }
    const selectedParroquias = (zone.coverages || [])
      .filter(
        c =>
          c.estadoId === estadoId &&
          c.municipioId === municipioId &&
          typeof c.parroquiaId === 'number'
      )
      .map(c => c.parroquiaId as number);
    setCoverageSelectedIds(selectedParroquias);
  };

  const handleCreateZone = async (zoneData: CreateShippingZoneAdvancedInput) => {
    try {
      const res = await shippingApi.createZone(zoneData);
      const enriched = enrichZoneCoverages(res.data);
      setShippingZones(prev => [...prev, enriched]);
      return { success: true as const };
    } catch (err) {
      console.error('[SettingsPage] Error creating zone:', err);
      return { success: false as const, error: 'No se pudo crear la zona' };
    }
  };

  const handleUpdateZone = async (id: string, updates: Partial<CreateShippingZoneAdvancedInput>) => {
    try {
      const res = await shippingApi.updateZone(id, updates);
      const enriched = enrichZoneCoverages(res.data);
      setShippingZones(prev => prev.map(z => (z.id === id ? enriched : z)));
      return { success: true as const };
    } catch (err) {
      console.error('[SettingsPage] Error updating zone:', err);
      if (err instanceof ApiError) {
        return { success: false as const, error: err.message };
      }
      return { success: false as const, error: 'No se pudo actualizar la zona' };
    }
  };

  const handleDeleteZone = async (id: string) => {
    try {
      await shippingApi.deleteZone(id);
      setShippingZones(prev => prev.filter(z => z.id !== id));
      return { success: true as const };
    } catch (err) {
      console.error('[SettingsPage] Error deleting zone:', err);
      if (err instanceof ApiError) {
        return { success: false as const, error: err.message };
      }
      return { success: false as const, error: 'No se pudo eliminar la zona' };
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-20">
      <datalist id="country-code-list">
        {countries
          .filter(c => c.phoneCode)
          .map(c => (
            <option key={c.id} value={`${c.phoneCode} `} label={`${c.nombre} (${c.phoneCode})`} />
          ))}
        {veAreaCodes.map(a => {
          const intl = a.codigo.startsWith('0') ? a.codigo.slice(1) : a.codigo;
          const value = `+58 ${intl} `;
          const labelParts = [a.codigo, a.tipo, a.operadora, a.estado_principal].filter(Boolean);
          return (
            <option
              key={a.id}
              value={value}
              label={labelParts.join(' - ')}
            />
          );
        })}
      </datalist>

      {/* ── STICKY HEADER ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 -mx-6 border-b border-zinc-800 bg-zinc-950/95 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-50">Configuración</h1>
            <p className="text-xs text-zinc-500">Ajusta tu negocio, catálogo, pagos y más.</p>
          </div>
          <div className="flex items-center gap-3">
            {isDirty && (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                <span className="text-[11px] font-medium text-amber-400">
                  {dirtyCount} sin guardar
                </span>
              </div>
            )}
            {savedOk && (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
                <span className="text-[11px] font-medium text-emerald-400">✓ Guardado</span>
              </div>
            )}
            <button
              type="submit"
              disabled={saving || loading}
              className="flex items-center gap-2 rounded-xl bg-[#f5c842] px-5 py-2.5 text-sm font-bold text-zinc-950 shadow-lg shadow-yellow-950/30 transition hover:bg-[#f5c842]/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>Guardando...</>
              ) : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      {/* ── ERROR BANNER ──────────────────────────────────────────────────── */}
      {saveError && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <span style={{ whiteSpace: 'pre-line' }}>⚠ {saveError}</span>
          <button type="button" onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-200">✕</button>
        </div>
      )}
      {/* ── SUCCESS BANNER ────────────────────────────────────────────────── */}
      {savedOk && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          <span>✓ Datos guardados correctamente</span>
          <button type="button" onClick={() => setSavedOk(false)} className="text-emerald-400 hover:text-emerald-200">✕</button>
        </div>
      )}

      {/* ── SKELETON ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-12 rounded-xl bg-zinc-800" />
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-zinc-800/70" />)}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* ── LEFT COLUMN ───────────────────────────────────────────────── */}
          <div className="space-y-5 min-w-0">

            {/* Tab bar */}
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-1 scrollbar-hide">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-zinc-950 text-zinc-100 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                TAB: MI NEGOCIO
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'negocio' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader title="Datos de la tienda" subtitle="Información visible en tu catálogo público" icon="🏷️" />
                  <div className="grid grid-cols-2 gap-4 p-5">
                    <Field label="Nombre de la tienda" error={errors.name?.message}>
                      <input {...register('name', { validate: validators.name })}
                        className={errors.name ? iErrCls : iCls} placeholder="Mis Modas 2025" />
                    </Field>
                    <Field label="Slug / URL" error={errors.slug?.message}
                      hint={`ventasve.app/c/${watchedValues.slug || 'tutienda'}`}>
                      <input {...register('slug', { validate: validators.slug })}
                        className={errors.slug ? iErrCls : iCls} placeholder="mismodas2025" />
                    </Field>
                    <Field label="Teléfono WhatsApp" error={errors.whatsappPhone?.message} hint="Escribe país o código y selecciona para autocompletar">
                      <input
                        {...register('whatsappPhone', { validate: validators.whatsappPhone })}
                        type="tel"
                        list="country-code-list"
                        className={errors.whatsappPhone ? iErrCls : iCls}
                        placeholder="+58 412-555-0123"
                      />
                    </Field>
                    <Field label="Ciudad principal" error={errors.city?.message}>
                      <input
                        {...register('city', { validate: validators.city })}
                        className={errors.city ? iErrCls : iCls}
                        placeholder="Ej: Caracas, Distrito Capital"
                      />
                    </Field>
                    <Field label="Instagram">
                      <input {...register('instagram')} className={iCls} placeholder="@mismodas2025" />
                    </Field>
                    <Field label="Horario de atención">
                      <input {...register('schedule')} className={iCls} placeholder="Lun–Sáb 8am–6pm" />
                    </Field>
                    <Field label="Tipo de negocio" error={errors.businessType?.message} full>
                      <select {...register('businessType', { validate: validators.businessType })}
                        className={errors.businessType ? iErrCls : iCls} style={{ appearance:'none' }} disabled={catalogsLoading || bizTypes.length === 0}>
                        <option value="">Seleccionar...</option>
                        {bizTypes.map(t => (
                          <option key={t.id} value={t.codigo}>
                            {t.nombre}
                          </option>
                        ))}
                      </select>
                      {catalogsError && <p className="mt-1 text-[10px] text-red-400">⚠ {catalogsError}</p>}
                    </Field>
                    <div className="col-span-2">
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        Descripción
                        <span className="float-right font-normal text-zinc-600">{(watchedValues.description || '').length}/300</span>
                      </label>
                      <textarea {...register('description', { validate: validators.description })}
                        className={`min-h-[90px] resize-none ${errors.description ? iErrCls : iCls}`}
                        placeholder="Describe brevemente tu tienda..." />
                      {errors.description && <p className="mt-1 text-[10px] text-red-400">⚠ {errors.description.message}</p>}
                    </div>
                    <div className="col-span-2">
                      <LogoUpload preview={logoPreview} onPreviewChange={setLogoPreview} />
                    </div>
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Ubicación" subtitle="Información de dirección para clientes y logística" icon="📍" />
                  <div className="grid grid-cols-2 gap-4 p-5">
                    <Field label="Dirección del negocio" error={errors.businessAddress?.message} full>
                      <input
                        {...register('businessAddress', { validate: validators.businessAddress })}
                        className={errors.businessAddress ? iErrCls : iCls}
                        placeholder="Calle, edificio, local... (máx. 200 caracteres)"
                      />
                    </Field>
                    <Field label="Estado" error={errors.estadoId?.message}>
                      <select
                        {...register('estadoId', { validate: validators.estadoId })}
                        className={errors.estadoId ? iErrCls : iCls}
                        style={{ appearance: 'none' }}
                      >
                        <option value="">Seleccionar estado...</option>
                        {estados.map(e => (
                          <option key={e.id} value={e.id}>{e.nombre_estado}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Municipio" error={errors.municipioId?.message}>
                      <select
                        {...register('municipioId', { validate: validators.municipioId })}
                        className={errors.municipioId ? iErrCls : iCls}
                        style={{ appearance: 'none' }}
                        disabled={!watchedValues.estadoId}
                      >
                        <option value="">Seleccionar municipio...</option>
                        {municipios.map(m => (
                          <option key={m.id} value={m.id}>{m.nombre_municipio}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Parroquia">
                      <select
                        {...register('parroquiaId')}
                        className={iCls}
                        style={{ appearance: 'none' }}
                        disabled={!watchedValues.municipioId}
                      >
                        <option value="">Seleccionar parroquia...</option>
                        {parroquias.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre_parroquia}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Datos fiscales" subtitle="Información para facturación e identificación tributaria" icon="🧾" />
                  <div className="grid grid-cols-2 gap-4 p-5">
                    <div className="col-span-2">
                      <Field label="Perfil fiscal del negocio" full>
                        <select
                          {...register('businessProfile')}
                          className={iCls}
                          style={{ appearance: 'none' }}
                        >
                          {BUSINESS_PROFILES.map(p => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                          ))}
                        </select>
                        <p className="mt-1 text-[10px] text-amber-400">
                          {BUSINESS_PROFILES.find(p => p.id === watchedValues.businessProfile)?.description}
                        </p>
                      </Field>
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--foreground2)]">Tipo de persona</label>
                      <div className="flex flex-wrap items-center gap-4">
                        {personTypes.map(p => (
                          <label key={p.id} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                            <input
                              type="radio"
                              value={p.codigo}
                              {...register('personaType')}
                              className="accent-[var(--accent)]"
                            />
                            {p.nombre}
                          </label>
                        ))}
                      </div>
                      {catalogsError && (
                        <p className="mt-1 text-[10px] text-red-400">⚠ {catalogsError}</p>
                      )}
                    </div>
                    <Field label="RIF" error={errors.rif?.message}>
                      <input {...register('rif', { validate: validators.rif })} className={errors.rif ? iErrCls : iCls} placeholder="J-12345678-9" />
                    </Field>
                    <Field label="Razón social">
                      <input {...register('razonSocial')} className={iCls} placeholder="Nombre legal de la empresa" />
                    </Field>
                    <Field label="Dirección fiscal" error={errors.fiscalAddress?.message} full>
                      <input {...register('fiscalAddress', { validate: validators.fiscalAddress })} className={errors.fiscalAddress ? iErrCls : iCls} placeholder="Dirección completa para facturación" />
                    </Field>
                    <Field label="Código postal">
                      <input {...register('postalCode')} className={iCls} placeholder="Ej: 1010" />
                    </Field>
                    <div className="col-span-2">
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--foreground2)]">Opciones</label>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <input type="checkbox" {...register('electronicInvoicing')} className="accent-[var(--accent)]" />
                          Requiere facturación electrónica
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--foreground2)]">Régimen ISLR</span>
                          <select
                            {...register('islrRegimen')}
                            className={iCls}
                            style={{ appearance: 'none' }}
                            disabled={catalogsLoading || islrRegimens.length === 0}
                          >
                            <option value="">Seleccionar...</option>
                            {islrRegimens.map(r => (
                              <option key={r.id} value={r.codigo}>
                                {r.nombre}
                              </option>
                            ))}
                          </select>
                          {catalogsError && (
                            <p className="mt-1 text-[10px] text-red-400">⚠ {catalogsError}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Administrador" subtitle="Datos del propietario/administrador para contacto y notificaciones" icon="👤" />
                  <div className="grid grid-cols-2 gap-4 p-5">
                    <Field label="Nombre completo">
                      <input {...register('ownerName')} className={iCls} placeholder="Nombre y apellido" />
                    </Field>
                    <Field label="Email" error={errors.ownerEmail?.message}>
                      <input {...register('ownerEmail', { validate: validators.ownerEmail })} type="email" className={errors.ownerEmail ? iErrCls : iCls} placeholder="admin@tienda.com" />
                    </Field>
                    <Field label="Teléfono" error={errors.ownerPhone?.message} hint="Escribe país o código y selecciona para autocompletar">
                      <input
                        {...register('ownerPhone', { validate: validators.ownerPhone })}
                        list="country-code-list"
                        className={errors.ownerPhone ? iErrCls : iCls}
                        placeholder="+58 412-555-0123"
                      />
                    </Field>
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB: PAGOS
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'pagos' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader title="Métodos de pago" subtitle="Configura cómo recibes el dinero de tus clientes" icon="💳" />
                  <div className="grid grid-cols-2 gap-4 p-5">

                    {/* Zelle */}
                    <div className="col-span-1 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><span className="text-lg">💸</span><span className="text-sm font-bold text-zinc-100">Zelle</span></div>
                        <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVO</span>
                      </div>
                      <Field label="Email o teléfono" error={errors.zelleEmail?.message}>
                        <input {...register('zelleEmail', { validate: validators.zelleEmail })}
                          className={`text-xs py-2 ${errors.zelleEmail ? iErrCls : iCls}`} placeholder="email@ejemplo.com" />
                      </Field>
                      <Field label="Nombre del titular">
                        <input {...register('zelleName')} className={`text-xs py-2 ${iCls}`} placeholder="Juan Martínez" />
                      </Field>
                    </div>

                    {/* Pago Móvil */}
                    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><span className="text-lg">📱</span><span className="text-sm font-bold text-zinc-100">Pago Móvil</span></div>
                        <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVO</span>
                      </div>
                      <input {...register('pagoMovilPhone')} className={`text-xs py-2 ${iCls}`} placeholder="Número de teléfono" />
                      <select {...register('pagoMovilBank')} className={`text-xs py-2 ${iCls}`} style={{ appearance:'none' }} disabled={catalogsLoading || banks.length === 0}>
                        <option value="">Seleccionar banco...</option>
                        {banks.map(b => (
                          <option key={b.id} value={b.nombre_corto || b.nombre}>
                            {b.nombre_corto || b.nombre}
                          </option>
                        ))}
                      </select>
                      {catalogsError && <p className="mt-1 text-[10px] text-red-400">⚠ {catalogsError}</p>}
                      <input {...register('pagoMovilId')} className={`text-xs py-2 ${iCls}`} placeholder="Cédula del titular" />
                    </div>

                    {/* Binance */}
                    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><span className="text-lg">⚡</span><span className="text-sm font-bold text-zinc-100">Binance Pay</span></div>
                        <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVO</span>
                      </div>
                      <input {...register('binanceId')} className={`text-xs py-2 ${iCls}`} placeholder="Binance Pay ID o email" />
                    </div>

                    {/* Transferencia */}
                    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><span className="text-lg">🏦</span><span className="text-sm font-bold text-zinc-100">Transferencia</span></div>
                        <span className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-500">OPCIONAL</span>
                      </div>
                      <input {...register('transferAccount')} className={`text-xs py-2 ${iCls}`} placeholder="Número de cuenta" />
                      <input {...register('transferName')} className={`text-xs py-2 ${iCls}`} placeholder="Titular" />
                    </div>

                    {/* Efectivo USD */}
                    <div className="col-span-2 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                      <div className="flex items-center gap-2"><span className="text-lg">💵</span><span className="text-sm font-bold text-zinc-100">Efectivo USD</span></div>
                      <Field label="Tasa de cambio (USD → Bs)" error={errors.cashUsdExchangeRate?.message}
                        hint="Usada para mostrar el equivalente en Bs. al cliente">
                        <input {...register('cashUsdExchangeRate', { validate: validators.cashRate })}
                          type="number" step="0.01" className={errors.cashUsdExchangeRate ? iErrCls : iCls} placeholder="Ej: 36500" />
                      </Field>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB: CATÁLOGO
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'catalogo' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader title="Opciones del catálogo" subtitle="Controla qué ve el cliente en tu tienda pública" icon="🛍️" />
                  <div className="px-5 py-3">
                    <Controller name="showBs" control={control} render={({ field }) => (
                      <ToggleRow title="Mostrar precios en Bs." desc="Conversión automática al tipo de cambio BCV"
                        checked={!!field.value} onChange={field.onChange} />
                    )} />
                    <Controller name="showStock" control={control} render={({ field }) => (
                      <ToggleRow title="Mostrar stock disponible" desc="El cliente verá las unidades disponibles"
                        checked={!!field.value} onChange={field.onChange} />
                    )} />
                    <Controller name="showChatButton" control={control} render={({ field }) => (
                      <ToggleRow title="Botón flotante de WhatsApp" desc="Acceso rápido al chat en el catálogo"
                        checked={!!field.value} onChange={field.onChange} />
                    )} />
                    <Controller name="allowOrdersWithoutStock" control={control} render={({ field }) => (
                      <ToggleRow title="Permitir pedidos sin stock" desc="El cliente puede pedir aunque no haya existencias"
                        checked={!!field.value} onChange={field.onChange} />
                    )} />
                    <Controller name="showSearch" control={control} render={({ field }) => (
                      <ToggleRow title="Búsqueda de productos" desc="Barra de búsqueda visible en el catálogo"
                        checked={!!field.value} onChange={field.onChange} />
                    )} />
                    <Controller name="showStrikePrice" control={control} render={({ field }) => (
                      <ToggleRow title="Precio tachado en ofertas" desc="Muestra el precio original junto al precio de oferta"
                        checked={!!field.value} onChange={field.onChange} />
                    )} />
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Límites de pedido" subtitle="Montos mínimos y máximos por orden" icon="🎯" />
                  <div className="grid grid-cols-2 gap-4 p-5">
                    <Field label="Monto mínimo de pedido ($)" error={errors.minOrderAmount?.message}>
                      <input {...register('minOrderAmount')} type="number" step="0.01"
                        className={iCls} placeholder="0.00" />
                    </Field>
                    <Field label="Monto máximo de pedido ($)" error={errors.maxOrderAmount?.message}>
                      <input {...register('maxOrderAmount')} type="number" step="0.01"
                        className={iCls} placeholder="Sin límite" />
                    </Field>
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════
               TAB: ENVÍOS — VERSIÓN CON DATOS REALES
               ═════════════════════════════════ */}
            {activeTab === 'envios' && (
              <div className="space-y-4">
                {/* Banner de error */}
                {shippingError && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
                    <span>⚠ {shippingError}</span>
                    <button
                      type="button"
                      onClick={() => setShippingError(null)}
                      className="text-amber-400 hover:text-amber-200"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Card: Zonas de envío */}
                <Card>
                  <CardHeader
                    title="Zonas de envío"
                    subtitle="Define los costos según la ubicación del cliente"
                    icon="🚚"
                    action={
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await handleCreateZone({
                            name: 'Nueva zona',
                            price: 5,
                            free: false,
                            coverages: [],
                          });
                          if (!result.success) {
                            alert(result.error);
                          }
                        }}
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-[#f5c842] hover:text-[#f5c842] transition"
                      >
                        + Agregar zona
                      </button>
                    }
                  />

                  {shippingLoading ? (
                    <div className="p-5 space-y-3 animate-pulse">
                      {[1, 2].map(i => (
                        <div key={i} className="h-14 rounded-xl bg-zinc-800/50" />
                      ))}
                    </div>
                  ) : shippingZones.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                      <div className="text-3xl mb-2">🗺️</div>
                      <p className="text-sm font-medium">Aún no tienes zonas configuradas</p>
                      <p className="text-xs mt-1">Crea tu primera zona para definir costos de envío</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800 p-2">
                      {shippingZones.map(zone => (
                        <div
                          key={zone.id}
                          className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-zinc-800/30 transition"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm">
                            🗺️
                          </div>

                            <div className="flex flex-1 flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div className="flex-1 space-y-1">
                              <input
                                value={zone.name}
                                onChange={async e => {
                                  await handleUpdateZone(zone.id, { name: e.target.value });
                                }}
                                className="w-full rounded-lg border border-white/40 bg-black/70 px-3 py-1.5 text-sm font-semibold text-zinc-50 outline-none focus:border-[#f5c842]"
                              />
                            <div className="inline-flex flex-wrap items-center gap-2 text-[10px]">
                              <span className="rounded-full bg-[#f5c842] px-3 py-1 font-semibold text-black">
                                {zone.coverages && zone.coverages.length > 0
                                  ? getCoverageShortText(zone.coverages)
                                  : 'Sin cobertura definida'}
                              </span>
                              {zone.coverages && zone.coverages.length > 0 && (
                                <CoverageDetailPanel
                                  coverages={zone.coverages}
                                  hasConflict={zone.coverages.some(cov => cov.hasConflict)}
                                  conflictMessage={
                                    zone.coverages.find(cov => cov.hasConflict)
                                      ?.conflictMessage || undefined
                                  }
                                />
                              )}
                            </div>
                              <div className="flex flex-wrap items-center gap-1 text-[10px] text-zinc-400">
                                <button
                                  type="button"
                                  onClick={() => openCoverageEditor(zone, 'estado')}
                                  className="rounded-full border border-[#f5c842] bg-[#f5c842] px-3 py-1 text-[10px] font-semibold text-black hover:bg-[#ffd84a] hover:border-[#ffd84a] transition"
                                >
                                  Editar por estado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openCoverageEditor(zone, 'municipio')}
                                  className="rounded-full border border-[#f5c842] bg-[#f5c842] px-3 py-1 text-[10px] font-semibold text-black hover:bg-[#ffd84a] hover:border-[#ffd84a] transition"
                                >
                                  Editar municipios
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openCoverageEditor(zone, 'parroquia')}
                                  className="rounded-full border border-[#f5c842] bg-[#f5c842] px-3 py-1 text-[10px] font-semibold text-black hover:bg-[#ffd84a] hover:border-[#ffd84a] transition"
                                >
                                  Editar parroquias
                                </button>
                              </div>
                            </div>
                            <div className="mt-2 flex items-end justify-end gap-3 md:mt-0">
                              <div className="flex flex-col items-end gap-1">
                                {zone.free ? (
                                  <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-400">
                                    GRATIS
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-zinc-500">$</span>
                                    <input
                                      type="number"
                                      value={zone.price}
                                      onChange={async e => {
                                        const price = parseFloat(e.target.value) || 0;
                                        await handleUpdateZone(zone.id, { price });
                                      }}
                                      className="w-20 rounded-lg border border-white bg-black px-2 py-1 text-xs text-zinc-50 outline-none focus:border-[#f5c842]"
                                    />
                                  </div>
                                )}
                                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-zinc-500">
                                  <input
                                    type="checkbox"
                                    checked={zone.free}
                                    onChange={async e => {
                                      await handleUpdateZone(zone.id, { free: e.target.checked });
                                    }}
                                    className="rounded border-zinc-700 bg-zinc-800 accent-[#f5c842]"
                                  />
                                  Gratis
                                </label>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setZonePendingDelete(zone);
                                  setShowDeleteConfirm(true);
                                }}
                                className="text-zinc-600 hover:text-red-400 transition text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {coverageZone && (
                  <MultiSelectModal
                    items={getCoverageItems()}
                    selected={coverageSelectedIds}
                    onChange={async selectedIds => {
                      if (!coverageZone) return;
                      setCoverageSelectedIds(selectedIds);
                      const existing = coverageZone.coverages || [];
                      let coverages: CreateShippingZoneAdvancedInput['coverages'] = [];
                      if (coverageMode === 'estado') {
                        const selectedSet = new Set(selectedIds);
                        if (selectedIds.length === 0) {
                          coverages = [];
                        } else {
                          const keptExisting = existing.filter(cov => selectedSet.has(cov.estadoId));
                          const mappedExisting = keptExisting.map(cov => ({
                            estadoId: cov.estadoId,
                            municipioId: cov.municipioId ?? null,
                            parroquiaId: cov.parroquiaId ?? null,
                          }));
                          const existingStateIds = new Set(mappedExisting.map(cov => cov.estadoId));
                          const newStateIds = selectedIds.filter(id => !existingStateIds.has(id));
                          const newCoverages = newStateIds.map(id => ({
                            estadoId: id,
                            municipioId: null,
                            parroquiaId: null,
                          }));
                          coverages = [...mappedExisting, ...newCoverages];
                        }
                      } else if (coverageMode === 'municipio') {
                        if (!coverageBaseEstadoId) {
                          setCoverageZone(null);
                          return;
                        }
                        const otherStates = existing.filter(
                          cov => cov.estadoId !== coverageBaseEstadoId
                        );
                        coverages = [
                          ...otherStates.map(cov => ({
                            estadoId: cov.estadoId,
                            municipioId: cov.municipioId ?? null,
                            parroquiaId: cov.parroquiaId ?? null,
                          })),
                          ...selectedIds.map(id => ({
                            estadoId: coverageBaseEstadoId,
                            municipioId: id,
                            parroquiaId: null,
                          })),
                        ];
                      } else if (coverageMode === 'parroquia') {
                        if (!coverageBaseEstadoId || !coverageBaseMunicipioId) {
                          setCoverageZone(null);
                          return;
                        }
                        const others = existing.filter(
                          cov =>
                            cov.estadoId !== coverageBaseEstadoId ||
                            cov.municipioId !== coverageBaseMunicipioId
                        );
                        coverages = [
                          ...others.map(cov => ({
                            estadoId: cov.estadoId,
                            municipioId: cov.municipioId ?? null,
                            parroquiaId: cov.parroquiaId ?? null,
                          })),
                          ...selectedIds.map(id => ({
                            estadoId: coverageBaseEstadoId,
                            municipioId: coverageBaseMunicipioId,
                            parroquiaId: id,
                          })),
                        ];
                      }
                      if (coverages.length > 0) {
                        try {
                          for (const cov of coverages) {
                            const res = await shippingApi.validateCoverage({
                              estadoId: cov.estadoId,
                              municipioId:
                                typeof cov.municipioId === 'number'
                                  ? cov.municipioId
                                  : null,
                              parroquiaId:
                                typeof cov.parroquiaId === 'number'
                                  ? cov.parroquiaId
                                  : null,
                              zoneId: coverageZone.id,
                            });
                            if (!res.data.valid) {
                              setShippingError(
                                res.data.message ||
                                  'Esta cobertura se solapa con otra zona de envío'
                              );
                              return;
                            }
                          }
                        } catch (err) {
                          if (err instanceof ApiError) {
                            setShippingError(err.message);
                          } else {
                            setShippingError('No se pudo validar la cobertura');
                          }
                          return;
                        }
                      }
                      const updates: Partial<CreateShippingZoneAdvancedInput> = {
                        coverages,
                      };
                      const result = await handleUpdateZone(coverageZone.id, updates);
                      if (!result.success && result.error) {
                        setShippingError(result.error);
                      }
                      setCoverageZone(null);
                      setCoverageSelectedIds([]);
                      setCoverageBaseEstadoId(null);
                      setCoverageBaseMunicipioId(null);
                    }}
                    title={
                      coverageMode === 'estado'
                        ? `Cobertura por estado de "${coverageZone.name}"`
                        : coverageMode === 'municipio'
                        ? `Cobertura por municipio de "${coverageZone.name}"`
                        : `Cobertura por parroquia de "${coverageZone.name}"`
                    }
                    searchPlaceholder={
                      coverageMode === 'estado'
                        ? 'Buscar estado...'
                        : coverageMode === 'municipio'
                        ? 'Buscar municipio...'
                        : 'Buscar parroquia...'
                    }
                    headerSlot={
                      coverageMode === 'estado'
                        ? null
                        : coverageMode === 'municipio'
                        ? (
                          <div className="flex gap-2">
                            <select
                              value={coverageBaseEstadoId ?? ''}
                              onChange={e => {
                                if (!coverageZone) return;
                                const value = e.target.value;
                                if (!value) return;
                                const estadoId = Number(value);
                                if (Number.isNaN(estadoId)) return;
                                void loadCoverageMunicipios(coverageZone, estadoId);
                              }}
                              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 outline-none focus:border-[#f5c842]"
                            >
                              <option value="">Selecciona un estado</option>
                              {estados.map(e => (
                                <option key={e.id} value={e.id}>
                                  {e.nombre_estado}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                        : (
                          <div className="flex gap-2">
                            <select
                              value={coverageBaseEstadoId ?? ''}
                              onChange={e => {
                                if (!coverageZone) return;
                                const value = e.target.value;
                                if (!value) return;
                                const estadoId = Number(value);
                                if (Number.isNaN(estadoId)) return;
                                setCoverageBaseMunicipioId(null);
                                setCoverageParroquias([]);
                                void loadCoverageMunicipios(coverageZone, estadoId);
                              }}
                              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 outline-none focus:border-[#f5c842]"
                            >
                              <option value="">Estado</option>
                              {estados.map(e => (
                                <option key={e.id} value={e.id}>
                                  {e.nombre_estado}
                                </option>
                              ))}
                            </select>
                            <select
                              value={coverageBaseMunicipioId ?? ''}
                              onChange={e => {
                                if (!coverageZone) return;
                                if (!coverageBaseEstadoId) return;
                                const value = e.target.value;
                                if (!value) return;
                                const municipioId = Number(value);
                                if (Number.isNaN(municipioId)) return;
                                void loadCoverageParroquias(
                                  coverageZone,
                                  coverageBaseEstadoId,
                                  municipioId
                                );
                              }}
                              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 outline-none focus:border-[#f5c842]"
                            >
                              <option value="">Municipio</option>
                              {coverageMunicipios.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.nombre_municipio}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                    }
                    onClose={() => {
                      setCoverageZone(null);
                      setCoverageSelectedIds([]);
                      setCoverageBaseEstadoId(null);
                      setCoverageBaseMunicipioId(null);
                    }}
                  />
                )}

                {showDeleteConfirm && zonePendingDelete && (
                  <ConfirmModal
                    title="Eliminar zona"
                    message={`¿Eliminar "${zonePendingDelete.name}"? Esta acción no se puede deshacer.`}
                    variant="danger"
                    onConfirm={async () => {
                      const result = await handleDeleteZone(zonePendingDelete.id);
                      if (!result.success && result.error) {
                        setShippingError(result.error);
                      }
                      setShowDeleteConfirm(false);
                      setZonePendingDelete(null);
                    }}
                    onCancel={() => {
                      setShowDeleteConfirm(false);
                      setZonePendingDelete(null);
                    }}
                  />
                )}

                {/* Card: Opciones de envío */}
                <Card>
                  <CardHeader title="Opciones de envío" icon="⚙️" />
                  <div className="px-5 py-3">
                    <ToggleRow
                      title="Envío gratuito por monto mínimo"
                      desc="Aplica envío gratis cuando el pedido supera cierto valor"
                      checked={freeShippingEnabled}
                      onChange={setFreeShippingEnabled}
                    />
                    {freeShippingEnabled && (
                      <div className="mb-3 ml-0 mt-2">
                        <Field label="Monto mínimo para envío gratis ($)">
                          <input
                            type="number"
                            value={freeShippingMin}
                            onChange={e => setFreeShippingMin(+e.target.value)}
                            className={`${iCls} py-2 text-xs`}
                            placeholder="Ej: 50"
                          />
                        </Field>
                      </div>
                    )}
                    <ToggleRow
                      title="Pickup / Retiro en tienda"
                      desc="El cliente puede retirar personalmente"
                      checked={pickupEnabled}
                      onChange={setPickupEnabled}
                    />
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB: CHATBOT
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'chatbot' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader title="Flujo del bot" subtitle="Pasos que seguirá el asistente al conversar con clientes" icon="🤖" />
                  <div className="space-y-2 p-4">
                    {botSteps.map(step => (
                      <div key={step.id} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f5c842] text-[11px] font-black text-zinc-950">{step.num}</div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <input
                            value={step.label}
                            onChange={e => setBotSteps(p => p.map(s => s.id === step.id ? { ...s, label: e.target.value } : s))}
                            className="w-full bg-transparent text-sm font-semibold text-zinc-100 outline-none"
                          />
                          <input
                            value={step.desc}
                            onChange={e => setBotSteps(p => p.map(s => s.id === step.id ? { ...s, desc: e.target.value } : s))}
                            className="w-full bg-transparent text-xs text-zinc-500 outline-none"
                          />
                        </div>
                        <button type="button"
                          onClick={() => setBotSteps(p => p.filter(s => s.id !== step.id))}
                          className="text-zinc-700 hover:text-red-400 transition text-xs shrink-0">✕</button>
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => setBotSteps(p => [...p, { id: Date.now().toString(), num: p.length + 1, label: 'Nuevo paso', desc: 'Descripción del paso' }])}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 py-3 text-xs font-medium text-zinc-500 hover:border-[#f5c842] hover:text-[#f5c842] transition">
                      + Agregar paso
                    </button>
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Personalidad del bot" icon="✨" />
                  <div className="grid grid-cols-2 gap-4 p-5">
                    <Field label="Nombre del bot">
                      <input value={botName} onChange={e => setBotName(e.target.value)}
                        className={iCls} placeholder="Valeria" />
                    </Field>
                    <Field label="Tono de respuesta">
                      <select value={botTone} onChange={e => setBotTone(e.target.value)}
                        className={iCls} style={{ appearance:'none' }}>
                        {['Profesional', 'Amigable', 'Casual', 'Formal'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="border-t border-zinc-800 px-5 py-3">
                    <ToggleRow title="Respuesta fuera de horario" desc="El bot avisa cuando la tienda está cerrada"
                      checked={outOfHours} onChange={setOutOfHours} />
                    <ToggleRow title="Escalar a humano automáticamente" desc="Si el cliente no recibe respuesta en 30 min"
                      checked={escalate} onChange={setEscalate} />
                    <ToggleRow title="Respuestas rápidas sugeridas" desc="Muestra opciones de respuesta al cliente"
                      checked={quickReplies} onChange={setQuickReplies} />
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB: MÓDULOS
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'modulos' && (
              <Card>
                <CardHeader title="Módulos activos" subtitle="Activa o desactiva funcionalidades de la plataforma" icon="🧩" />
                <div className="grid grid-cols-2 gap-3 p-5">
                  {modules.map(mod => (
                    <div key={mod.id}
                      className={`relative rounded-xl border p-4 transition-all ${
                        mod.enabled ? 'border-[#f5c842]/30 bg-[#f5c842]/5' : 'border-zinc-800 bg-zinc-950/40'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-2xl mb-1">{mod.icon}</div>
                          <div className="text-sm font-bold text-zinc-100">{mod.name}</div>
                        </div>
                        <Toggle checked={mod.enabled} onChange={() => toggleModule(mod.id)} accent />
                      </div>
                      <p className="text-[11px] text-zinc-500 mb-2 leading-relaxed">{mod.desc}</p>
                      <PlanBadge plan={mod.plan} />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB: NOTIFICACIONES
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'notificaciones' && (
              <div className="space-y-4">
                {/* WhatsApp */}
                <Card>
                  <CardHeader title="WhatsApp" icon="💬" />
                  <div className="px-5 py-3">
                    {[
                      ['newOrder',          'Nuevo pedido recibido'],
                      ['orderStatusUpdate', 'Actualización de estado del pedido'],
                      ['newMessage',        'Mensaje de cliente sin responder 30 min'],
                      ['lowStock',          'Producto con stock bajo (<5 unidades)'],
                      ['dailySummary',      'Resumen diario de ventas (8 AM)'],
                      ['botEscalation',     'Bot escaló conversación a humano'],
                    ].map(([ev, label]) => (
                      <ToggleRow key={ev} title={label as string}
                        checked={notifSettings.whatsapp?.[ev] ?? true}
                        onChange={val => handleNotif('whatsapp', ev, val)} />
                    ))}
                  </div>
                </Card>

                {/* SMS */}
                <Card>
                  <CardHeader title="SMS" icon="📱" />
                  <div className="px-5 py-3">
                    {[
                      ['newOrder',          'Nuevo pedido recibido'],
                      ['orderStatusUpdate', 'Actualización de estado'],
                    ].map(([ev, label]) => (
                      <ToggleRow key={ev} title={label as string}
                        checked={notifSettings.sms?.[ev] ?? false}
                        onChange={val => handleNotif('sms', ev, val)} />
                    ))}
                  </div>
                </Card>

                {/* Email */}
                <Card>
                  <CardHeader title="Email" icon="📧" />
                  <div className="px-5 py-3">
                    {[
                      ['newOrder',    'Nuevo pedido recibido'],
                      ['weeklyReport','Reporte semanal de ventas'],
                    ].map(([ev, label]) => (
                      <ToggleRow key={ev} title={label as string}
                        checked={notifSettings.email?.[ev] ?? false}
                        onChange={val => handleNotif('email', ev, val)} />
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB: PLAN
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'plan' && (
              <div className="space-y-4">
                {/* Plan cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      name: 'Básico', price: 'Gratis', period: 'Para siempre', current: false,
                      features: ['Catálogo hasta 20 productos', 'Pagos básicos'],
                      missing: ['ChatBot IA', 'Inbox unificado'],
                    },
                    {
                      name: 'Pro', price: '$19', period: '/mes', current: true,
                      features: ['Productos ilimitados', 'Todos los métodos de pago', 'ChatBot IA WhatsApp', 'Inbox WA + IG + Web'],
                      missing: [],
                    },
                    {
                      name: 'Business', price: '$49', period: '/mes', current: false,
                      features: ['Todo lo de Pro', 'Cupones y marketing', 'Multi-sucursal', 'API y webhooks'],
                      missing: [],
                    },
                  ].map(plan => (
                    <div key={plan.name}
                      className={`rounded-2xl border p-5 transition-all ${
                        plan.current
                          ? 'border-[#f5c842]/50 bg-[#f5c842]/5 shadow-lg shadow-[#f5c842]/5'
                          : 'border-zinc-800 bg-zinc-900/60'
                      }`}
                    >
                      {plan.current && (
                        <div className="mb-3 inline-block rounded-md bg-[#f5c842] px-2 py-0.5 text-[10px] font-black text-zinc-950">PLAN ACTUAL</div>
                      )}
                      <div className="text-sm font-bold text-zinc-300">{plan.name}</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-3xl font-black text-zinc-50">{plan.price}</span>
                        <span className="text-xs text-zinc-500">{plan.period}</span>
                      </div>
                      <div className="my-4 space-y-1.5">
                        {plan.features.map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs text-zinc-300">
                            <span className="text-emerald-400">✓</span>{f}
                          </div>
                        ))}
                        {plan.missing.map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs text-zinc-600">
                            <span>✗</span>{f}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={plan.current}
                        className={`w-full rounded-xl py-2 text-xs font-bold transition ${
                          plan.current
                            ? 'cursor-default bg-zinc-800 text-zinc-500'
                            : 'bg-[#f5c842] text-zinc-950 hover:bg-[#f5c842]/90 active:scale-95'
                        }`}
                      >
                        {plan.current ? 'Plan actual' : plan.name === 'Básico' ? 'Plan anterior' : `Mejorar a ${plan.name}`}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Zona de peligro */}
                <Card>
                  <CardHeader title="Zona de peligro" icon="⚠️"
                    subtitle="Estas acciones pueden afectar permanentemente tu cuenta"
                  />
                  <div className="divide-y divide-zinc-800 p-4">
                    {[
                      { title: 'Exportar todos mis datos', desc: 'Descarga pedidos, clientes y configuración en un archivo', btn: 'Exportar', style: 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' },
                      { title: 'Pausar mi tienda temporalmente', desc: 'El catálogo mostrará "Temporalmente cerrado"', btn: 'Pausar', style: 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' },
                      { title: 'Eliminar cuenta y todos los datos', desc: 'Acción irreversible. Se borrarán productos, pedidos y clientes.', btn: 'Eliminar cuenta', style: 'border-red-500/40 text-red-400 hover:bg-red-500/10' },
                    ].map(item => (
                      <div key={item.title} className="flex items-center justify-between gap-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{item.desc}</p>
                        </div>
                        <button type="button"
                          className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition ${item.style}`}>
                          {item.btn}
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* WhatsApp connection in Plan tab */}
                <Card>
                  <CardHeader title="Conexión WhatsApp" subtitle="Estado de vinculación de tu número de negocio" icon="💬" />
                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
                      <div>
                        <p className="text-xs font-bold text-zinc-100 uppercase tracking-tight">Estado</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 max-w-[200px]">
                          {waLoading ? 'Verificando...' : whatsappStatus?.connected ? 'Conectado a WhatsApp' : 'No conectado'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {whatsappStatus?.connected && <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                        <span className={`text-xs font-bold ${whatsappStatus?.connected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {waLoading ? '...' : whatsappStatus?.connected ? 'Conectado' : 'Desconectado'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={whatsappStatus?.connected ? handleWhatsappDisconnect : handleWhatsappConnect}
                        disabled={waLoading}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          whatsappStatus?.connected
                            ? 'border border-red-500/40 bg-red-950/50 text-red-300 hover:bg-red-900/70 disabled:opacity-50'
                            : 'border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/70 disabled:opacity-50'
                        }`}
                      >
                        {waLoading
                          ? 'Procesando...'
                          : whatsappStatus?.connected
                            ? 'Desconectar WhatsApp'
                            : 'Conectar WhatsApp'}
                      </button>
                      <button
                        type="button"
                        onClick={refreshWhatsappStatus}
                        disabled={waLoading}
                        className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-[11px] font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Actualizar estado
                      </button>
                    </div>
                    {waError && (
                      <p className="text-[11px] text-red-400">
                        {waError}
                      </p>
                    )}
                    {!whatsappStatus?.connected && whatsappStatus?.qr && (
                      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-zinc-700 p-6 text-center">
                        <p className="text-xs font-bold text-zinc-100">Escanea el código QR</p>
                        <p className="text-[10px] text-zinc-500">WhatsApp → Dispositivos vinculados → Escanear QR</p>
                        <div className="rounded-2xl bg-white p-3 shadow-2xl">
                          <Image src={whatsappStatus.qr} alt="QR" width={160} height={160} unoptimized className="h-40 w-40" />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

          </div>

          {/* ── RIGHT COLUMN: LIVE PREVIEW ───────────────────────────────── */}
          <div>
            <div className="sticky top-24 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#f5c842] animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Preview en vivo</span>
              </div>
              <LivePreview data={watchedValues} logo={logoPreview} />
              <p className="text-center text-[10px] text-zinc-600">Vista aproximada del catálogo público</p>
            </div>
          </div>

        </div>
      )}
      {(savedOk || saveError) && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          {savedOk && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500 text-white px-4 py-3 text-sm font-semibold shadow-lg shadow-emerald-500/30">
              ✓ Configuración guardada con éxito
            </div>
          )}
          {saveError && (
            <div className="rounded-xl border border-red-500/40 bg-red-600 text-white px-4 py-3 text-sm font-semibold shadow-lg shadow-red-500/30">
              ⚠ {saveError}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
