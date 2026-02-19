import { api } from './client';
import { getAccessToken } from '../auth/storage';

export type BusinessSettings = {
  name?: string;
  slug?: string;
  whatsappPhone?: string;
  city?: string;
  instagram?: string;
  schedule?: string;
  description?: string;
  paymentMethods?: Record<string, unknown>;
  catalogOptions?: Record<string, boolean>;
};

const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const settingsApi = {
  get() {
    return api.get<BusinessSettings>('/settings', { headers: authHeaders() });
  },
  update(data: Partial<BusinessSettings>) {
    return api.patch<BusinessSettings>('/settings', data, { headers: authHeaders() });
  }
};
