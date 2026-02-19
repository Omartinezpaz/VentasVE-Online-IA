'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { productsApi, Product } from '@/lib/api/products';
import { DualPrice } from '@/components/ui/DualPrice';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await productsApi.list();
        setProducts(response.data.data);
      } catch (err) {
        setError('No se pudieron cargar los productos');
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await productsApi.delete(id);
      setProducts(products.filter(p => p.id !== id));
    } catch {
      alert('Error al eliminar el producto');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-[var(--foreground)]">Catálogo de Productos</h1>
          <p className="text-xs text-[var(--muted)]">Gestiona tus productos, precios e inventario.</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-zinc-950 shadow-lg active:scale-95 transition-transform"
        >
          + Nuevo Producto
        </Link>
      </div>

      {loading && <div className="text-sm text-[var(--muted)]">Cargando productos...</div>}
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map(product => (
          <div key={product.id} className="card-elevated overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-xl flex flex-col">
            <div className="aspect-video bg-[var(--background)] flex items-center justify-center text-4xl text-[var(--muted)]">
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                product.name.charAt(0)
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-heading text-base font-bold text-[var(--foreground)] truncate pr-2">{product.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${product.isPublished ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                  {product.isPublished ? 'Publicado' : 'Borrador'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted)] line-clamp-2 mb-4">{product.description || 'Sin descripción'}</p>

              <div className="mt-auto space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] font-bold text-[var(--muted)] uppercase">Precio</div>
                    <DualPrice usdCents={product.priceUsdCents} showBoth className="font-bold" />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-[var(--muted)] uppercase">Stock</div>
                    <div className={`text-sm font-bold ${product.stock < 5 ? 'text-orange-500' : 'text-[var(--foreground)]'}`}>{product.stock} un.</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex gap-2">
                  <Link
                    href={`/dashboard/products/${product.id}/edit`}
                    className="flex-1 py-2 rounded-lg bg-zinc-800 text-center text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && products.length === 0 && (
        <div className="text-center py-20 bg-[var(--surface)] rounded-[32px] border-2 border-dashed border-[var(--border)]">
          <div className="text-4xl mb-4">📦</div>
          <h2 className="font-heading text-lg font-bold text-[var(--foreground)]">No hay productos</h2>
          <p className="text-sm text-[var(--muted)] mb-6">Comienza agregando tu primer producto al catálogo.</p>
          <Link
            href="/dashboard/products/new"
            className="inline-block rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-zinc-950 shadow-lg"
          >
            + Agregar producto
          </Link>
        </div>
      )}
    </div>
  );
}
