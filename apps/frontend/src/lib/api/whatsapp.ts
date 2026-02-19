import { api } from './client';
import { getAccessToken } from '../auth/storage';

export type WhatsappStatus = {
  connected: boolean;
  qr: string | null;
};

const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`
  };
};

export const whatsappApi = {
  getStatus() {
    return api.get<WhatsappStatus>('/whatsapp/status', {
      headers: authHeaders()
    });
  }
};

