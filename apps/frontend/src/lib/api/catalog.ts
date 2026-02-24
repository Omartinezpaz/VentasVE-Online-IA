import { api } from './client';
import type { PaymentMethods } from './settings';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Server-safe fetch for public catalog endpoints (no auth needed) */
async function serverGet<T>(path: string): Promise<{ data: T }> {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  const data = await res.json();
  return { data };
}

export type PublicOrderItem = {
  productId: string;
  quantity: number;
  variantSelected?: Record<string, unknown>;
};

export type PublicOrderPayload = {
  customer: {
    phone: string;
    name?: string;
    address?: string;
    email?: string;
    addressNotes?: string;
    identification?: string;
    preferences?: {
      preferredPayment?: string;
      deliveryInstructions?: string;
      [key: string]: unknown;
    };
  };
  items: PublicOrderItem[];
  paymentMethod: string;
  notes?: string;
  shippingZoneId?: number;
  shippingCostCents?: number;
};

export type DocumentType = {
  id: string;
  codigo: string;  // V, E, J, P, etc.
  nombre: string;
  orden?: number;
};

export type PublicPaymentMethod = {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
  requiresAccount?: boolean;
  requiresProof?: boolean;
  order?: number;
};

export type PublicPaymentConfig = PaymentMethods;

export type ShippingMethodOption = {
  methodId: number;
  methodCode: string;
  methodName: string;
  icon?: string | null;
  cost: number;
  isFree: boolean;
  costType: string;
  costValue: number;
  minOrderAmount: number;
  formattedCost: string;
};

export type ShippingZone = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  deliveryTime?: string | null;
   estadoId?: number | null;
   municipioId?: number | null;
   parroquiaId?: number | null;
  methods: ShippingMethodOption[];
};

export const catalogApi = {
  getBusiness(slug: string) {
    return serverGet(`/catalog/${slug}`);
  },
  getProducts(slug: string) {
    return serverGet(`/catalog/${slug}/products`);
  },
  getProduct(slug: string, id: string) {
    return serverGet(`/catalog/${slug}/products/${id}`);
  },
  createOrder(slug: string, data: PublicOrderPayload) {
    return api.post(`/catalog/${slug}/orders`, data);
  },
  getDocumentTypes() {
    return api.get<DocumentType[]>('/catalog/document-types');
  },
  getPaymentMethods(slug: string) {
    return api.get<PublicPaymentMethod[]>(`/catalog/${slug}/payment-methods`);
  },
  getPaymentConfig(slug: string) {
    return api.get<PublicPaymentConfig>(`/catalog/${slug}/payment-config`);
  },
  getShippingZones(slug: string, params: { amount: number }) {
    return api.get<{ zones: ShippingZone[]; currency: string; cartAmount: number }>(`/catalog/${slug}/shipping-zones`, {
      params
    });
  }
};
