'use client';

import { useEffect, useCallback } from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    },
    [onCancel, onConfirm]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const confirmBtnClass =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-400 text-white'
      : variant === 'warning'
      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
      : 'bg-[#f5c842] hover:bg-[#f5c842]/90 text-zinc-950';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
          {variant === 'danger' && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
              ⚠
            </span>
          )}
          <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-3 bg-zinc-950/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-lg border border-zinc-700 px-4 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-300 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
