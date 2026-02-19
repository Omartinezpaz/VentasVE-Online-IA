'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { categoriesApi, Category } from '@/lib/api/categories';
import { getAccessToken } from '@/lib/auth/storage';

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const res = await categoriesApi.list();
      setCategories(res.data.data);
    } catch {
      setError('No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    load();
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await categoriesApi.create({ name: newName });
      setNewName('');
      load();
    } catch {
      setError('No se pudo crear la categoría');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;
    try {
      await categoriesApi.delete(id);
      load();
    } catch {
      setError('No se pudo eliminar la categoría');
    }
  };

  if (loading) return <div className="p-6 text-zinc-400">Cargando categorías...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-zinc-50">Categorías</h1>
        <p className="text-xs text-zinc-400">Organiza tus productos por grupos.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-4">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nombre de la nueva categoría"
          className="flex-1 rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] transition-all"
        />
        <button
          type="submit"
          disabled={creating}
          className="px-6 rounded-xl bg-[var(--accent)] text-black font-bold text-sm shadow-lg shadow-orange-950/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {creating ? '...' : '+ Agregar'}
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(cat => (
          <div key={cat.id} className="card-elevated flex items-center justify-between p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
             <div className="min-w-0">
                <div className="text-sm font-bold text-zinc-100 truncate">{cat.name}</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">/{cat.slug}</div>
             </div>
             <button onClick={() => handleDelete(cat.id)} className="text-xs font-bold text-red-500/50 hover:text-red-500 transition-colors uppercase">Eliminar</button>
          </div>
        ))}
        {!categories.length && (
            <div className="col-span-full py-12 text-center text-xs text-zinc-500">No hay categorías registradas.</div>
        )}
      </div>
    </div>
  );
}
