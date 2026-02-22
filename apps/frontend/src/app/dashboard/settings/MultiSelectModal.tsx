'use client';

import { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import type { SelectableItem } from '@/lib/api/shipping';

interface MultiSelectModalProps {
  items: SelectableItem[];
  selected: number[];
  onChange: (selectedIds: number[]) => void;
  title: string;
  searchPlaceholder?: string;
  onClose: () => void;
  maxItems?: number;
  minItems?: number;
  headerSlot?: ReactNode;
}

export default function MultiSelectModal({
  items,
  selected,
  onChange,
  title,
  searchPlaceholder = 'Buscar...',
  onClose,
  maxItems,
  minItems = 0,
  headerSlot,
}: MultiSelectModalProps) {
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<number[]>(selected);

  useEffect(() => {
    setLocalSelected(selected);
  }, [selected]);

  const filtered = useMemo(
    () =>
      items.filter(item =>
        item.nombre.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  const toggle = (id: number) => {
    setLocalSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (maxItems && prev.length >= maxItems) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const selectAll = () => {
    if (localSelected.length === filtered.length) {
      setLocalSelected([]);
    } else {
      setLocalSelected(filtered.map(i => i.id));
    }
  };

  const handleCancel = useCallback(() => {
    setLocalSelected(selected);
    onClose();
  }, [selected, onClose]);

  const handleSave = () => {
    if (localSelected.length < minItems) {
      alert(`Debe seleccionar al menos ${minItems} elemento(s)`);
      return;
    }
    onChange(localSelected);
    onClose();
  };

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [handleCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
          <button
            onClick={handleCancel}
            className="text-zinc-500 hover:text-zinc-300 transition text-lg leading-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="p-3 border-b border-zinc-800 space-y-2">
          {headerSlot}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[#f5c842] placeholder:text-zinc-600"
          />
        </div>

        <div className="max-h-72 overflow-auto p-2">
          {filtered.length > 0 ? (
            filtered.map(item => (
              <label
                key={item.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-800 cursor-pointer transition group"
              >
                <input
                  type="checkbox"
                  checked={localSelected.includes(item.id)}
                  onChange={() => toggle(item.id)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 accent-[#f5c842] focus:ring-[#f5c842]/30"
                />
                <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition">
                  {item.nombre}
                </span>
                {item.codigo && (
                  <span className="ml-auto text-[10px] text-zinc-600 font-mono">
                    {item.codigo}
                  </span>
                )}
              </label>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-500">
                No hay resultados para “{search}”
              </p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mt-2 text-xs text-[#f5c842] hover:underline"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 bg-zinc-950/50 rounded-b-2xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={filtered.length === 0}
              className="text-xs text-[#f5c842] hover:text-[#f5c842]/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {localSelected.length === filtered.length && filtered.length > 0
                ? 'Deseleccionar todos'
                : 'Seleccionar todos'}
            </button>
            <span className="text-[10px] text-zinc-600">
              {localSelected.length} de {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-zinc-700 px-4 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-300 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={
                localSelected.length < minItems ||
                (maxItems ? localSelected.length > maxItems : false)
              }
              className="rounded-lg bg-[#f5c842] px-4 py-1.5 text-xs font-bold text-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f5c842]/90 transition"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
