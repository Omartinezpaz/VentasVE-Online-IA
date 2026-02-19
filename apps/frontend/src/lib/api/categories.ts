import { api } from './client';
import { getAccessToken } from '../auth/storage';

export type Category = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const categoriesApi = {
  list() {
    return api.get<{ data: Category[] }>('/categories', { headers: authHeaders() });
  },
  create(data: { name: string; active?: boolean }) {
    return api.post<Category>('/categories', data, { headers: authHeaders() });
  },
  update(id: string, data: Partial<Category>) {
    return api.patch<Category>(`/categories/${id}`, data, { headers: authHeaders() });
  },
  delete(id: string) {
    return api.delete(`/categories/${id}`, { headers: authHeaders() });
  }
};
