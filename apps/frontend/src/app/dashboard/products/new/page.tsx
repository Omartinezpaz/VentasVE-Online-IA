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
  const [stock, setStock] = useState('0');
  const [isPublished, setIsPublished] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    try {
      const priceUsdCents = Math.round(parseFloat(priceUsd) * 100);
      if (isNaN(priceUsdCents)) throw new Error('Precio inválido');

      const res = await productsApi.create({
        name,
        description,
        priceUsdCents,
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
