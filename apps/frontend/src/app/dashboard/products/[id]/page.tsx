'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { productsApi, Product } from '@/lib/api/products';
import { getAccessToken } from '@/lib/auth/storage';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const apiBaseUrl = new URL(API_BASE);
const IMAGE_BASE_ORIGIN = `${apiBaseUrl.protocol}//${apiBaseUrl.host}`;

const resolveImageUrl = (src: string) => {
  if (!src) return src;
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:') || src.startsWith('data:')) {
    return src;
  }
  if (!src.startsWith('/')) return src;
  return `${IMAGE_BASE_ORIGIN}${src}`;
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [costUsd, setCostUsd] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMsg, setFormMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    const load = async () => {
      try {
        const res = await productsApi.get(id);
        const p = res.data as Product;
        setName(p.name || '');
        setDescription(p.description || '');
        setPriceUsd((p.priceUsdCents / 100).toString());
        setCostUsd(p.costCents != null ? (p.costCents / 100).toString() : '');
        setStock((p.stock ?? 0).toString());
        setCategoryId(p.categoryId || '');
        setActive(p.isPublished);
        setExistingImages(p.images || []);
      } catch {
        setError('No se pudo cargar el producto');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setNewImages(prev => [...prev, ...files]);
    const previews = files.map(file => URL.createObjectURL(file));
    setNewImagePreviews(prev => [...prev, ...previews]);
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFormMsg(null);
    try {
      const price = Number.parseFloat(priceUsd);
      const cost = costUsd ? Number.parseFloat(costUsd) : NaN;
      if (!Number.isNaN(price) && !Number.isNaN(cost) && cost > price) {
        setFormMsg({ text: 'El costo no puede ser mayor que el precio', ok: false });
        setSaving(false);
        return;
      }
      await productsApi.update(id, {
        name,
        description,
        priceUsdCents: Math.round(parseFloat(priceUsd) * 100),
        costCents: costUsd ? Math.round(parseFloat(costUsd) * 100) : undefined,
        stock: parseInt(stock),
        categoryId: categoryId || undefined,
        isPublished: active,
        images: existingImages
      });
      if (newImages.length > 0) {
        await productsApi.uploadImages(id, newImages);
      }
      router.push('/dashboard/products');
    } catch {
      setError('No se pudo actualizar el producto');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-zinc-400">Cargando producto...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
          ‹
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold text-zinc-50">Editar Producto</h1>
          <p className="text-xs text-zinc-400">Modifica los detalles de tu producto.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-sm text-red-200">
          {error}
        </div>
      )}
      {formMsg && (
        <div className={`p-3 rounded-lg text-xs ${formMsg.ok ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300' : 'bg-red-500/15 border border-red-500/40 text-red-300'}`}>
          {formMsg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card-elevated rounded-[24px] border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Imágenes del Producto</label>
            <div
              onClick={() => document.getElementById('image-upload')?.click()}
              className="relative aspect-square w-32 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-[var(--accent)] transition-all"
            >
              {existingImages[0] || newImagePreviews[0] ? (
                <Image
                  src={resolveImageUrl(newImagePreviews[0] || existingImages[0])}
                  fill
                  className="object-cover"
                  alt="Imagen principal del producto"
                  unoptimized
                />
              ) : (
                <>
                  <span className="text-2xl opacity-30 group-hover:scale-110 transition-transform">📸</span>
                  <span className="mt-1 text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    Subir imágenes
                  </span>
                </>
              )}
            </div>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />
            {(existingImages.length > 0 || newImagePreviews.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {existingImages.map((src, idx) => (
                  <div
                    key={`existing-${idx}`}
                    className="relative h-10 w-10 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
                  >
                    <Image
                      src={resolveImageUrl(src)}
                      fill
                      className="object-cover"
                      alt={`Imagen existente ${idx + 1}`}
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(idx)}
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {newImagePreviews.map((src, idx) => (
                  <div
                    key={`new-${idx}`}
                    className="relative h-10 w-10 overflow-hidden rounded-lg border border-[var(--accent)]/60 bg-zinc-900"
                  >
                    <Image
                      src={resolveImageUrl(src)}
                      fill
                      className="object-cover"
                      alt={`Nueva imagen ${idx + 1}`}
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveNewImage(idx)}
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-zinc-500">
              Formatos: JPG, PNG, WEBP. Máx. 5MB.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Nombre</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] transition-all min-h-[100px] resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Precio (USD)</label>
              <input
                type="number"
                step="0.01"
                required
                value={priceUsd}
                onChange={e => setPriceUsd(e.target.value)}
                className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Costo (USD)</label>
              <input
                type="number"
                step="0.01"
                value={costUsd}
                onChange={e => setCostUsd(e.target.value)}
                className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] transition-all"
                placeholder="Opcional"
              />
              <p className="text-[10px] text-zinc-500">
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
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : pct > 30
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : pct >= 10
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30';
                return (
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                      <span className="font-bold uppercase">Margen estimado</span>
                      <button
                        type="button"
                        className="h-4 w-4 flex items-center justify-center rounded-full border border-zinc-700 text-[9px] text-zinc-500 cursor-help"
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Stock</label>
              <input
                type="number"
                value={stock}
                onChange={e => setStock(e.target.value)}
                className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/40 border border-zinc-800">
            <div className="text-xs font-bold text-zinc-100">Producto activo y visible</div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${active ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${active ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-[var(--accent)] py-4 font-heading text-lg font-bold text-black shadow-xl shadow-orange-950/20 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Actualizar Producto'}
        </button>
      </form>
    </div>
  );
}
