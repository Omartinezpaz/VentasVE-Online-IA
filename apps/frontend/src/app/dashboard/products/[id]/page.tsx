'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { productsApi, Product } from '@/lib/api/products';
import { getAccessToken } from '@/lib/auth/storage';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setStock((p.stock ?? 0).toString());
        setCategoryId(p.categoryId || '');
        setActive(p.isPublished);
      } catch {
        setError('No se pudo cargar el producto');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await productsApi.update(id, {
        name,
        description,
        priceUsdCents: Math.round(parseFloat(priceUsd) * 100),
        stock: parseInt(stock),
        categoryId: categoryId || undefined,
        isPublished: active
      });
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card-elevated rounded-[24px] border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
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
