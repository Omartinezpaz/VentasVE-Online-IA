import { api } from './client';

export type Product = {
  id: string;
  name: string;
  description?: string;
  priceUsdCents: number;
  costCents?: number | null;
  stock: number;
  images: string[];
  isPublished: boolean;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
};

export type CreateProductInput = {
  name: string;
  description?: string;
  priceUsdCents: number;
  costCents?: number | null;
  stock?: number;
  categoryId?: string;
  isPublished?: boolean;
  images?: string[];
};

export const productsApi = {
  list(params?: { page?: number; limit?: number; search?: string; categoryId?: string }) {
    return api.get('/products', { params });
  },
  get(id: string) {
    return api.get(`/products/${id}`);
  },
  create(data: CreateProductInput) {
    return api.post('/products', data);
  },
  update(id: string, data: Partial<CreateProductInput>) {
    return api.patch(`/products/${id}`, data);
  },
  delete(id: string) {
    return api.delete(`/products/${id}`);
  },
  updateStock(id: string, stock: number) {
    return api.patch(`/products/${id}/stock`, { stock });
  },
  uploadImages(id: string, files: File[]) {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    return api.post(`/products/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};
