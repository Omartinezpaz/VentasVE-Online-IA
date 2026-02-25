'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { productsApi, Product } from '@/lib/api/products';
import { DualPrice } from '@/components/ui/DualPrice';

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

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSortByMargin = searchParams.get('sortBy') === 'margin';
  const initialOnlyLowMargin = searchParams.get('filter') === 'low-margin';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortByMargin, setSortByMargin] = useState(initialSortByMargin);
  const [onlyLowMargin, setOnlyLowMargin] = useState(initialOnlyLowMargin);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await productsApi.list();
        setProducts(response.data.data);
      } catch {
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

  useEffect(() => {
    const params = new URLSearchParams();
    if (sortByMargin) params.set('sortBy', 'margin');
    if (onlyLowMargin) params.set('filter', 'low-margin');
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [sortByMargin, onlyLowMargin, router]);

  const withMargin = products.map(p => {
    const cost = p.costCents ?? null;
    const marginCents = cost != null ? p.priceUsdCents - cost : null;
    const marginPct = cost != null && cost > 0 ? (marginCents! / cost) * 100 : null;
    return { ...p, _marginCents: marginCents, _marginPct: marginPct };
  });

  const filtered = withMargin.filter(p => {
    if (onlyLowMargin) {
      if (p._marginPct == null) return false;
      return p._marginPct < 10;
    }
    return true;
  });

  const displayed = [...filtered].sort((a, b) => {
    if (!sortByMargin) return 0;
    const am = a._marginPct ?? Number.POSITIVE_INFINITY;
    const bm = b._marginPct ?? Number.POSITIVE_INFINITY;
    return am - bm;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-[var(--foreground)]">Catálogo de Productos</h1>
          <p className="text-xs text-[var(--muted)]">Gestiona tus productos, precios e inventario.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
            <label className="text-[11px] text-[var(--muted)]">Ordenar por margen</label>
            <button
              onClick={() => setSortByMargin(v => !v)}
              className={`px-2 py-1 rounded-md text-[11px] font-bold ${sortByMargin ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[var(--surface2)] text-[var(--muted)] border border-[var(--border)]'}`}
            >
              {sortByMargin ? 'Activo' : 'Inactivo'}
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
            <label className="text-[11px] text-[var(--muted)]">Solo margen &lt; 10%</label>
            <button
              onClick={() => setOnlyLowMargin(v => !v)}
              className={`px-2 py-1 rounded-md text-[11px] font-bold ${onlyLowMargin ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-[var(--surface2)] text-[var(--muted)] border border-[var(--border)]'}`}
            >
              {onlyLowMargin ? 'Activo' : 'Inactivo'}
            </button>
          </div>
          <Link
            href="/dashboard/products/new"
            className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-zinc-950 shadow-lg active:scale-95 transition-transform"
          >
            + Nuevo Producto
          </Link>
        </div>
      </div>

      {loading && <div className="text-sm text-[var(--muted)]">Cargando productos...</div>}
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayed.map(product => (
          <div key={product.id} className="card-elevated overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-xl flex flex-col">
            <div className="relative aspect-video bg-[var(--background)] flex items-center justify-center text-4xl text-[var(--muted)] overflow-hidden">
              {product.images?.[0] ? (
                <Image
                  src={resolveImageUrl(product.images[0])}
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                product.name.charAt(0)
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-heading text-base font-bold text-[var(--foreground)] truncate pr-2">{product.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${product.isPublished ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-[var(--surface2)] text-[var(--muted)] border border-[var(--border)]'}`}>
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[var(--surface2)] p-2 border border-[var(--border)]">
                    <div className="text-[10px] font-bold text-[var(--muted)] uppercase">Costo</div>
                    <div className="text-sm font-bold text-[var(--foreground)]">
                      {typeof product.costCents === 'number' ? `$${(product.costCents / 100).toFixed(2)}` : '—'}
                    </div>
                  </div>
                  <div className="rounded-lg p-2 border" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-[10px] font-bold text-[var(--muted)] uppercase">Margen</div>
                      <button
                        type="button"
                        className="h-4 w-4 flex items-center justify-center rounded-full border border-[var(--border)] text-[9px] text-[var(--muted)] cursor-help"
                        title="Margen = (Precio - Costo) / Costo × 100"
                      >
                        ?
                      </button>
                    </div>
                    {product._marginPct != null ? (
                      <div className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-[11px] font-bold ${
                        product._marginPct > 30 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : product._marginPct >= 10 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        <span>${((product.priceUsdCents - (product.costCents ?? 0)) / 100).toFixed(2)}</span>
                        <span>({product._marginPct.toFixed(1)}%)</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[var(--muted)]">Sin costo</div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex gap-2">
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="flex-1 py-2 rounded-lg bg-[var(--surface2)] text-center text-xs font-bold text-[var(--foreground)] hover:bg-[var(--background)]/60 transition-colors"
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
