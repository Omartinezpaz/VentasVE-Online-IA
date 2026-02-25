'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { productsApi } from '@/lib/api/products';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [costUsd, setCostUsd] = useState('');
  const [stock, setStock] = useState('0');
  const [isPublished, setIsPublished] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMsg, setFormMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages(prev => [...prev, ...files]);
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previews]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFormMsg(null);

    try {
      const priceUsdCents = Math.round(parseFloat(priceUsd) * 100);
      if (isNaN(priceUsdCents)) throw new Error('Precio inválido');
      const costCents = costUsd ? Math.round(parseFloat(costUsd) * 100) : undefined;
      if (typeof costCents === 'number' && costCents > priceUsdCents) {
        setFormMsg({ text: 'El costo no puede ser mayor al precio', ok: false });
        setSubmitting(false);
        return;
      }

      const res = await productsApi.create({
        name,
        description,
        priceUsdCents,
        costCents,
        stock: parseInt(stock),
        isPublished
      });

      if (images.length > 0 && res.data.id) {
        await productsApi.uploadImages(res.data.id, images);
      }
      router.push('/dashboard/products');
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError('Error al crear el producto');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products" className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xl transition-colors hover:bg-[var(--background)]/60">
          ‹
        </Link>
        <h1 className="font-heading text-xl font-bold text-[var(--foreground)]">Nuevo Producto</h1>
      </div>

      <form onSubmit={handleSubmit} className="card-elevated rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">Imagen del Producto</label>
            <div
              onClick={() => document.getElementById('image-upload')?.click()}
              className="relative aspect-square w-32 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--background)] flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-[var(--accent)] transition-all"
            >
              {imagePreviews.length > 0 ? (
                <Image src={imagePreviews[0]} fill className="object-cover" alt="Preview" />
              ) : (
                <>
                  <span className="text-2xl opacity-30 group-hover:scale-110 transition-transform">📸</span>
                  <span className="text-[9px] font-bold text-[var(--muted)] mt-2 uppercase">Subir</span>
                </>
              )}
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            {imagePreviews.length > 1 && (
              <div className="mt-2 flex gap-2">
                {imagePreviews.slice(0, 4).map((src, idx) => (
                  <div key={idx} className="relative h-10 w-10 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)]">
                    <Image src={src} fill className="object-cover" alt={`Preview ${idx + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Nombre del Producto</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all"
              placeholder="Ej: Hamburguesa Especial"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all min-h-[100px] resize-none"
              placeholder="Describe los ingredientes, tamaño, etc."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Precio (USD $)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={priceUsd}
                  onChange={e => setPriceUsd(e.target.value)}
                  className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] pl-8 pr-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Costo (USD $)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={costUsd}
                  onChange={e => setCostUsd(e.target.value)}
                  className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] pl-8 pr-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all"
                  placeholder="Opcional"
                />
              </div>
              <p className="text-[10px] text-[var(--muted)]">
                Costo interno para calcular tu margen. No se muestra a tus clientes.
              </p>
              {(priceUsd || costUsd) && (() => {
                const p = Number.parseFloat(priceUsd || '0');
                const c = Number.parseFloat(costUsd || '0');
                const hasNums = Number.isFinite(p) && Number.isFinite(c) && !Number.isNaN(p) && !Number.isNaN(c) && (priceUsd !== '' && costUsd !== '');
                if (!hasNums) return null;
                const m = p - c;
                const pct = c > 0 ? (m / c) * 100 : null;
                const badgeClass =
                  pct == null
                    ? 'bg-[var(--surface2)] text-[var(--foreground)] border border-[var(--border)]'
                    : pct > 30
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : pct >= 10
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30';
                return (
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
                      <span className="font-bold uppercase">Margen estimado</span>
                      <button
                        type="button"
                        className="h-4 w-4 flex items-center justify-center rounded-full border border-[var(--border)] text-[9px] text-[var(--muted)] cursor-help"
                        title="Margen = (Precio - Costo) / Costo × 100"
                      >
                        ?
                      </button>
                    </div>
                    <div className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-[11px] font-bold ${badgeClass}`}>
                      <span>${m.toFixed(2)}</span>
                      {pct != null && <span>({pct.toFixed(1)}%)</span>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Stock Inicial</label>
              <input
                type="number"
                value={stock}
                onChange={e => setStock(e.target.value)}
                className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--background)]/50 border border-[var(--border)]">
             <div className="space-y-0.5">
                <div className="text-sm font-bold text-[var(--foreground)]">Publicar inmediatamente</div>
                <div className="text-[11px] text-[var(--muted)]">El producto será visible en el catálogo público.</div>
             </div>
             <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPublished ? 'bg-[var(--accent-secondary)]' : 'bg-[var(--surface2)]'}`}
             >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPublished ? 'translate-x-5' : 'translate-x-0'}`} />
             </button>
          </div>
        </div>

        {formMsg && <div className={`p-3 rounded-lg text-xs ${formMsg.ok ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300' : 'bg-red-500/15 border border-red-500/40 text-red-300'}`}>⚠ {formMsg.text}</div>}
        {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">⚠️ {error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-[var(--accent)] py-4 text-center font-heading text-lg font-bold text-zinc-950 shadow-xl shadow-orange-950/20 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {submitting ? 'Guardando...' : 'Crear Producto'}
        </button>
      </form>
    </div>
  );
}
