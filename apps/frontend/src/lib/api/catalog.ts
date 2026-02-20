import { api } from './client';
import type { PaymentMethods } from './settings';

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

export const catalogApi = {
  getBusiness(slug: string) {
    return api.get(`/catalog/${slug}`);
  },
  getProducts(slug: string) {
    return api.get(`/catalog/${slug}/products`);
  },
  getProduct(slug: string, id: string) {
    return api.get(`/catalog/${slug}/products/${id}`);
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
  }
};
