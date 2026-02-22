export type ShippingZoneCoverageInput = {
  estadoId: number;
  municipioId?: number | null;
  parroquiaId?: number | null;
};

export type ShippingZoneWithCoverages = {
  id: string;
  businessId: string;
  name: string;
  price: number;
  free: boolean;
  freeOver?: number | null;
  radius?: number | null;
  deliveryTime?: string | null;
  isActive: boolean;
  coverages: Array<{
    id: string;
    estadoId: number;
    municipioId?: number | null;
    parroquiaId?: number | null;
  }>;
};

export type CreateShippingZoneInput = {
  businessId: string;
  name: string;
  price: number;
  free?: boolean;
  freeOver?: number | null;
  radius?: number | null;
  deliveryTime?: string | null;
  coverages: ShippingZoneCoverageInput[];
};
