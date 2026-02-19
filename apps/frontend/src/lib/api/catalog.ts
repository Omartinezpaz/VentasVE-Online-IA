import { api } from './client';

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
  }
};
