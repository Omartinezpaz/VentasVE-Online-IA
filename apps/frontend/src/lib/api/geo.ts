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

export const geoApi = {
  getEstados: () => api.get<Estado[]>('/geo/estados'),
  getMunicipios: (estadoId: number) => api.get<Municipio[]>(`/geo/municipios/${estadoId}`),
  getParroquias: (municipioId: number) => api.get<Parroquia[]>(`/geo/parroquias/${municipioId}`)
};

