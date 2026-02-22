import { api } from './client';
import { getAccessToken } from '../auth/storage';

export type ShippingZoneCoverage = {
  id: string;
  estadoId: number;
  estadoNombre?: string;
  municipioId?: number | null;
  municipioNombre?: string | null;
  parroquiaId?: number | null;
  parroquiaNombre?: string | null;
  hasConflict?: boolean;
  conflictMessage?: string | null;
};

export type ShippingZoneRate = {
  methodCode: string;
  methodName: string;
  icon?: string | null;
  costType: string;
  costValue: number;
  minOrderAmount: number;
  isFree: boolean;
};

export type ShippingZone = {
  id: string;
  businessId: string;
  name: string;
  price: number;
  free: boolean;
  freeOver?: number | null;
  radius?: number | null;
  deliveryTime?: string | null;
  isActive: boolean;
  coverages: ShippingZoneCoverage[];
  rates?: ShippingZoneRate[];
  createdAt?: string;
};

export type CreateShippingZoneInput = {
  name: string;
  price: number;
  free?: boolean;
  freeOver?: number | null;
  radius?: number | null;
  deliveryTime?: string | null;
  isActive?: boolean;
  coverages: Array<{
    estadoId: number;
    municipioId?: number | null;
    parroquiaId?: number | null;
  }>;
};

export type ShippingZonesResponse = {
  zones: ShippingZone[];
  count: number;
  requestId?: string;
};

export type SelectableItem = {
  id: number;
  nombre: string;
  codigo?: string;
  estadoId?: number;
  municipioId?: number;
};

export type Estado = {
  id: number;
  nombre_estado: string;
  codigo?: string;
};

export type Municipio = {
  id: number;
  nombre_municipio: string;
  estadoId: number;
  codigo?: string;
};

export type Parroquia = {
  id: number;
  nombre_parroquia: string;
  municipioId: number;
  codigo?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  field?: string;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    field?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.field = field;
    this.details = details;
  }
}

const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const municipioToItem = (m: Municipio): SelectableItem => ({
  id: m.id,
  nombre: m.nombre_municipio,
  codigo: m.codigo,
  estadoId: m.estadoId,
});

export const parroquiaToItem = (p: Parroquia): SelectableItem => ({
  id: p.id,
  nombre: p.nombre_parroquia,
  codigo: p.codigo,
  municipioId: p.municipioId,
});

type ErrorWithResponse = {
  response?: {
    status?: number;
    data?: {
      error?: unknown;
      message?: unknown;
      code?: unknown;
      field?: unknown;
      details?: unknown;
    };
  };
};

const toApiError = (error: unknown, fallbackMessage: string): ApiError => {
  const err = error as ErrorWithResponse;
  const status = err.response?.status ?? 500;
  const data = err.response?.data ?? {};
  let message =
    (typeof data.error === 'string' && data.error) ||
    (typeof data.message === 'string' && data.message) ||
    fallbackMessage;
  const code = typeof data.code === 'string' ? data.code : undefined;
  const field = typeof data.field === 'string' ? data.field : undefined;
  const details = data.details;

  if (code === 'VALIDATION_FAILED' && Array.isArray(details) && details.length > 0) {
    const first = details[0] as { message?: unknown; path?: unknown };
    const detailMessage =
      typeof first.message === 'string'
        ? first.message
        : undefined;
    if (detailMessage) {
      message = `Error de validación: ${detailMessage}`;
    }
  }

  return new ApiError(message, status, code, field, details);
};

export const shippingApi = {
  async getZones() {
    try {
      return await api.get<ShippingZonesResponse>('/settings/shipping-zones', {
        headers: authHeaders()
      });
    } catch (error) {
      throw toApiError(error, 'No se pudieron obtener las zonas de envío');
    }
  },
  async createZone(data: CreateShippingZoneInput) {
    try {
      return await api.post<ShippingZone>('/settings/shipping-zones', data, {
        headers: authHeaders()
      });
    } catch (error) {
      throw toApiError(error, 'No se pudo crear la zona de envío');
    }
  },
  async updateZone(id: string, data: Partial<CreateShippingZoneInput>) {
    try {
      return await api.put<ShippingZone>(`/settings/shipping-zones/${id}`, data, {
        headers: authHeaders()
      });
    } catch (error) {
      throw toApiError(error, 'No se pudo actualizar la zona de envío');
    }
  },
  async deleteZone(id: string) {
    try {
      return await api.delete(`/settings/shipping-zones/${id}`, {
        headers: authHeaders()
      });
    } catch (error) {
      throw toApiError(error, 'No se pudo eliminar la zona de envío');
    }
  },
  async validateCoverage(coverage: {
    estadoId: number;
    municipioId?: number | null;
    parroquiaId?: number | null;
    zoneId?: string;
  }) {
    try {
      return await api.post<{ valid: boolean; message: string }>(
        '/settings/shipping-zones/validate-coverage',
        coverage,
        {
          headers: authHeaders()
        }
      );
    } catch (error) {
      throw toApiError(error, 'No se pudo validar la cobertura');
    }
  }
};

