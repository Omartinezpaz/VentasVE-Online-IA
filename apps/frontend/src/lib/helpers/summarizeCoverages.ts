import { ShippingZoneCoverage } from '@/lib/api/shipping';

export type CoverageSummary = {
  estadoNombre: string;
  municipioCount: number;
  parroquiaCount: number | 'todas';
  detalles: Array<{
    municipio: string;
    parroquias: string[] | 'todas';
  }>;
};

export const summarizeCoverages = (coverages: ShippingZoneCoverage[]): CoverageSummary[] => {
  if (!coverages || coverages.length === 0) return [];

  const byState = new Map<number, {
    estadoNombre: string;
    municipios: Map<number, {
      municipioNombre: string;
      parroquias: string[];
      coversAll: boolean;
    }>;
    coversAllMunicipios: boolean;
  }>();

  for (const cov of coverages) {
    if (!byState.has(cov.estadoId)) {
      byState.set(cov.estadoId, {
        estadoNombre: cov.estadoNombre ?? 'Desconocido',
        municipios: new Map(),
        coversAllMunicipios: false,
      });
    }
    const state = byState.get(cov.estadoId)!;

    if (!cov.municipioId) {
      state.coversAllMunicipios = true;
      continue;
    }

    if (!state.municipios.has(cov.municipioId)) {
      state.municipios.set(cov.municipioId, {
        municipioNombre: cov.municipioNombre ?? 'Sin nombre',
        parroquias: [],
        coversAll: false,
      });
    }
    const municipio = state.municipios.get(cov.municipioId)!;

    if (cov.parroquiaId && cov.parroquiaNombre) {
      municipio.parroquias.push(cov.parroquiaNombre);
    } else {
      municipio.coversAll = true;
    }
  }

  return Array.from(byState.values()).map(state => {
    if (state.coversAllMunicipios) {
      return {
        estadoNombre: state.estadoNombre,
        municipioCount: 0,
        parroquiaCount: 'todas',
        detalles: [{ municipio: 'Todos los municipios', parroquias: 'todas' }],
      } satisfies CoverageSummary;
    }

    const detalles = Array.from(state.municipios.values()).map(m => ({
      municipio: m.municipioNombre,
      parroquias: (m.coversAll || m.parroquias.length === 0)
        ? ('todas' as const)
        : m.parroquias,
    }));

    const hasAllParroquias = detalles.some(d => d.parroquias === 'todas');
    const parroquiaCount: number | 'todas' = hasAllParroquias
      ? 'todas'
      : detalles.reduce(
          (sum, d) => sum + (Array.isArray(d.parroquias) ? d.parroquias.length : 0),
          0
        );

    return {
      estadoNombre: state.estadoNombre,
      municipioCount: state.municipios.size,
      parroquiaCount,
      detalles,
    } satisfies CoverageSummary;
  });
};

export const getCoverageShortText = (coverages: ShippingZoneCoverage[]): string => {
  const summaries = summarizeCoverages(coverages);
  if (summaries.length === 0) return 'Sin cobertura configurada';

  const parts = summaries.map(s => {
    if (s.parroquiaCount === 'todas' && s.municipioCount === 0) {
      return `${s.estadoNombre} (completo)`;
    }
    return `${s.estadoNombre}: ${s.municipioCount} mun.`;
  });

  return parts.join(' · ');
};
