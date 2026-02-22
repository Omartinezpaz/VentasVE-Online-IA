import { api } from './client';

export type Estado = {
  id: number;
  codigo: string;
  nombre_estado: string;
};

export type Municipio = {
  id: number;
  estado_id: number;
  nombre_municipio: string;
  codigo: string;
};

export type Parroquia = {
  id: number;
  municipio_id: number;
  nombre_parroquia: string;
  codigo: string;
};

export type Country = {
  id: string;
  nombre: string;
  iso3: string;
  isoCode: string;
  iso2: string | null;
  phoneCode: string | null;
};

export type VeAreaCode = {
  id: string;
  codigo: string;
  tipo: string;
  operadora: string | null;
  estado_principal: string | null;
};

export const geoApi = {
  getEstados: () => api.get<Estado[]>('/geo/estados'),
  getMunicipios: (estadoId: number) => api.get<Municipio[]>(`/geo/municipios/${estadoId}`),
  getParroquias: (municipioId: number) => api.get<Parroquia[]>(`/geo/parroquias/${municipioId}`),
  getCountries: () => api.get<Country[]>('/geo/countries'),
  getVeAreaCodes: () => api.get<VeAreaCode[]>('/geo/ve-area-codes'),
};

