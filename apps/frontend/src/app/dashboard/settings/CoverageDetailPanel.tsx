'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ShippingZoneCoverage } from '@/lib/api/shipping';
import { summarizeCoverages } from '@/lib/helpers/summarizeCoverages';

interface CoverageDetailPanelProps {
  coverages: ShippingZoneCoverage[];
  hasConflict?: boolean;
  conflictMessage?: string;
}

export default function CoverageDetailPanel({
  coverages,
  hasConflict,
  conflictMessage,
}: CoverageDetailPanelProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  const summaries = summarizeCoverages(coverages);

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="text-[#f5c842] text-[10px] hover:underline focus:outline-none focus:ring-1 focus:ring-[#f5c842] rounded"
      >
        ver
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Detalle de cobertura"
          className="absolute z-30 w-72 p-3 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl -left-24 top-full mt-1"
        >
          <div className="text-[10px] font-bold text-zinc-400 uppercase mb-2">
            Cobertura detallada:
          </div>
          <ul className="space-y-1.5 text-xs text-zinc-300">
            {summaries.map((summary, idx) => (
              <li key={idx}>
                <span className="font-medium text-zinc-100">{summary.estadoNombre}</span>
                <ul className="ml-3 mt-0.5 space-y-0.5 text-zinc-400">
                  {summary.detalles.map((det, i) => (
                    <li key={i}>
                      • {det.municipio}:{' '}
                      {det.parroquias === 'todas'
                        ? 'todas las parroquias'
                        : det.parroquias.join(', ')}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {(hasConflict || coverages.some(cov => cov.hasConflict)) && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400">
              <span>⚠</span>
              <span>
                {conflictMessage ||
                  'Esta zona tiene solapamientos con otra zona de envío'}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={close}
            className="mt-3 w-full text-center text-[10px] text-zinc-500 hover:text-zinc-300 transition"
          >
            Cerrar
          </button>
        </div>
      )}
    </span>
  );
}
