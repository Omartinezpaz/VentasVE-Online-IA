import { api } from './client';
import { getAccessToken } from '../auth/storage';

const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
};

export type PaymentMethodMeta = {
  id: number;
  codigo: string;
  nombre: string;
  icono?: string | null;
  requiereCuenta: boolean;
  requiereComprobante: boolean;
  orden: number;
};

export type BusinessTypeMeta = {
  id: number;
  codigo: string;
  nombre: string;
  icono?: string | null;
  descripcion?: string | null;
  orden: number;
};

export type BankMeta = {
  id: number;
  codigo_ibp: string;
  nombre: string;
  nombre_corto?: string | null;
  orden: number;
};

export type IslrRegimenMeta = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  orden: number;
};

export type PersonTypeMeta = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  requiereRazonSocial: boolean;
  requiereNombreCompleto: boolean;
  orden: number;
};

export const metaApi = {
  getPaymentMethods() {
    return api.get<PaymentMethodMeta[]>('/meta/payment-methods', {
      headers: authHeaders(),
    });
  },
  getBusinessTypes() {
    return api.get<BusinessTypeMeta[]>('/meta/business-types', {
      headers: authHeaders(),
    });
  },
  getBanks() {
    return api.get<BankMeta[]>('/meta/banks', {
      headers: authHeaders(),
    });
  },
  getIslrRegimens() {
    return api.get<IslrRegimenMeta[]>('/meta/islr-regimens', {
      headers: authHeaders(),
    });
  },
  getPersonTypes() {
    return api.get<PersonTypeMeta[]>('/meta/person-types', {
      headers: authHeaders(),
    });
  },
};

