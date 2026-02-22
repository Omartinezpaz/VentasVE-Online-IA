import { api } from './client';
import { getAccessToken } from '../auth/storage';

// ─── PAYMENT METHOD TYPES ────────────────────────────────────────────────────
export type ZellePayment = {
  email?: string;
  name?: string;
};

export type PagoMovilPayment = {
  phone?: string;
  bank?: string;
  id?: string;
};

export type BinancePayment = {
  id?: string;
};

export type TransferPayment = {
  account?: string;
  name?: string;
};

export type PaymentMethods = {
  zelle?: ZellePayment;
  pagoMovil?: PagoMovilPayment;
  binance?: BinancePayment;
  transfer?: TransferPayment;
  cashUsd?: number | '';
};

// ─── CATALOG OPTIONS ─────────────────────────────────────────────────────────
export type CatalogOptions = {
  showBs?: boolean;
  showStock?: boolean;
  showChatButton?: boolean;
};

export type ShippingZoneConfig = {
  id: string;
  slug: string;
  name: string;
  price: number;
  free: boolean;
  distanceKm?: number;
  deliveryTime?: string;
};

export type ShippingOptionsConfig = {
  freeShippingEnabled?: boolean;
  freeShippingMin?: number;
  pickupEnabled?: boolean;
};

// ─── NOTIFICATION SETTINGS ───────────────────────────────────────────────────
export type NotificationChannel = {
  newOrder?: boolean;
  orderStatusUpdate?: boolean;
  newMessage?: boolean;
};

export type NotificationSettings = {
  whatsapp?: NotificationChannel;
  sms?: NotificationChannel;
  email?: NotificationChannel;
  [channel: string]: Record<string, boolean> | undefined;
};

// ─── MAIN BUSINESS SETTINGS TYPE ─────────────────────────────────────────────
export type BusinessSettings = {
  // Datos del negocio
  name?: string;
  slug?: string;
  whatsappPhone?: string;
  city?: string;
  instagram?: string;
  schedule?: string;
  description?: string;
  businessType?: string;
  // Datos del administrador (contacto)
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  // Dirección del negocio
  businessAddress?: string;
  // Datos fiscales
  personaType?: 'natural' | 'juridica';
  rif?: string;
  razonSocial?: string;
  fiscalAddress?: string;
  state?: string;
  municipio?: string;
  parroquia?: string;
  postalCode?: string;
  electronicInvoicing?: boolean;
  islrRegimen?: string;
  logoUrl?: string;

  // Tasa de cambio (campo raíz — para Efectivo USD)
  cashUsdExchangeRate?: number;

  // Métodos de pago (objeto anidado)
  paymentMethods?: PaymentMethods;

  // Opciones del catálogo
  catalogOptions?: CatalogOptions;

  // Notificaciones
  notificationSettings?: NotificationSettings;
  shippingZones?: ShippingZoneConfig[];
  shippingOptions?: ShippingOptionsConfig;
};

// ─── UPDATE PAYLOAD ───────────────────────────────────────────────────────────
// Mismo tipo pero todos opcionales — solo enviamos lo que cambió
export type UpdateSettingsPayload = Partial<BusinessSettings>;

// ─── AUTH HEADERS ─────────────────────────────────────────────────────────────
const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── API ──────────────────────────────────────────────────────────────────────
export const settingsApi = {
  get() {
    return api.get<BusinessSettings>('/settings', {
      headers: authHeaders(),
    });
  },

  update(data: UpdateSettingsPayload) {
    return api.patch<BusinessSettings>('/settings', data, {
      headers: authHeaders(),
    });
  },

  uploadLogo(file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post<{ logoUrl: string }>('/settings/logo', formData, {
      headers: {
        ...authHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
