'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

export default function ExchangeRatePage() {
  const [currentRate, setCurrentRate] = useState<any>(null);
  const [newRate, setNewRate] = useState('');
  const [source, setSource] = useState('MANUAL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRate = async () => {
    try {
      const res = await api.get('/exchange-rate/current');
      setCurrentRate(res.data);
      if (res.data) {
          setNewRate(res.data.usdToVes.toString());
          setSource(res.data.source);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRate();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/exchange-rate', {
        usdToVes: parseFloat(newRate),
        source
      });
      await loadRate();
      alert('Tasa actualizada correctamente');
    } catch {
      alert('Error al actualizar la tasa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-[var(--foreground)]">Tasa de Cambio</h1>
        <p className="text-xs text-[var(--muted)]">Gestiona la conversión automática de USD a Bolívares.</p>
      </div>

      <div className="card-elevated rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl space-y-8">
        <div className="text-center space-y-2">
            <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">Tasa Actual</div>
            <div className="font-heading text-5xl font-black text-[var(--accent)]">
                {loading ? '...' : currentRate ? `Bs. ${parseFloat(currentRate.usdToVes).toLocaleString('es-VE')}` : 'No definida'}
            </div>
            <div className="text-[10px] text-[var(--muted)] font-medium">
                Última actualización: {currentRate ? new Date(currentRate.date).toLocaleString() : 'N/A'}
            </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6 pt-6 border-t border-[var(--border)]">
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Nueva Tasa (Bs. por 1$)</label>
                    <input
                        type="number"
                        step="0.01"
                        required
                        value={newRate}
                        onChange={e => setNewRate(e.target.value)}
                        className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-4 py-3 text-lg font-bold text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all"
                        placeholder="0.00"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Fuente</label>
                    <select
                        value={source}
                        onChange={e => setSource(e.target.value)}
                        className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all appearance-none"
                    >
                        <option value="BCV">BCV (Banco Central)</option>
                        <option value="PARALELO">Paralelo</option>
                        <option value="MANUAL">Manual (Propia)</option>
                    </select>
                </div>
            </div>

            <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-[var(--accent)] py-4 text-center font-heading text-lg font-bold text-zinc-950 shadow-xl shadow-orange-950/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
                {saving ? 'Guardando...' : 'Actualizar Tasa'}
            </button>
        </form>

        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
            <div className="text-xl">ℹ️</div>
            <p className="text-[11px] text-blue-400 font-medium leading-relaxed">
                Esta tasa se utilizará para calcular automáticamente los precios en Bolívares en el catálogo público y en los pedidos por WhatsApp.
            </p>
        </div>
      </div>
    </div>
  );
}
