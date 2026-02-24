import { catalogApi } from '@/lib/api/catalog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CartLink } from './CartLink';
import { DualPrice } from '@/components/ui/DualPrice';
import { ThemeToggle } from '@/components/ThemeToggle';

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

type CatalogPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type CatalogOptions = {
  showBs?: boolean;
  showStock?: boolean;
   showChatButton?: boolean;
};

type CatalogBusiness = {
  id: string;
  name: string;
  description?: string | null;
   whatsapp?: string;
  catalogOptions?: CatalogOptions | null;
};

type CatalogProduct = {
  id: string;
  name: string;
  description?: string | null;
  priceUsdCents: number;
  stock?: number | null;
  images?: string[] | null;
};

export default async function CatalogPage({ params }: CatalogPageProps) {
  const { slug } = await params;

  let business: CatalogBusiness;
  let products: CatalogProduct[];

  try {
    const [businessRes, productsRes] = await Promise.all([
      catalogApi.getBusiness(slug),
      catalogApi.getProducts(slug)
    ]);

    business = businessRes.data as CatalogBusiness;
    products = productsRes.data.data as CatalogProduct[];
  } catch {
    notFound();
  }

  const showBs = business.catalogOptions?.showBs ?? true;
   const showChatButton = business.catalogOptions?.showChatButton ?? true;
  const cleanedWhatsapp = business.whatsapp?.replace(/\D/g, '') ?? '';

  return (
    <>
      <div className="min-h-screen bg-[var(--bg-light)] text-[var(--dark)]">
        <div className="mx-auto min-h-screen max-w-md bg-[var(--bg-light)] shadow-2xl overflow-x-hidden relative">

          {/* HEADER OSCURO */}
          <header className="relative overflow-hidden bg-[#1a1e2e] text-white px-5 pt-6 pb-0">
             {/* Decoración de fondo */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[radial-gradient(circle,rgba(245,200,66,0.3),transparent_70%)] pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[radial-gradient(circle,rgba(232,54,14,0.25),transparent_70%)] pointer-events-none" />

            <div className="relative z-10">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md text-lg cursor-pointer">
                  <span>‹</span>
                </div>
                <div className="flex items-center gap-2">
                  <CartLink slug={slug} />
                  <ThemeToggle />
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] text-3xl font-bold shadow-[0_4px_20px_rgba(232,54,14,0.4)] flex-shrink-0">
                  {business.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h1 className="font-heading text-2xl font-bold leading-none tracking-tight truncate">
                    {business.name}
                  </h1>
                  <p className="text-[13px] text-white/70 mt-0.5 font-medium">@{slug}</p>
                  <div className="mt-2 flex gap-1.5">
                    <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90">
                      ✓ Verificado
                    </span>
                    <span className="rounded-full bg-[var(--accent-secondary)]/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent-secondary)]">
                      ⚡ Envío rápido
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* STATS BAR */}
            <div className="relative z-10 flex border-t border-white/10 mt-2">
              <div className="flex-1 border-r border-white/10 py-4 text-center">
                <div className="font-heading text-lg font-bold leading-none">
                  {products.length}
                </div>
                <div className="mt-1 text-[9px] font-bold text-white/60 uppercase tracking-widest">
                  Productos
                </div>
              </div>
              <div className="flex-1 border-r border-white/10 py-4 text-center">
                <div className="font-heading text-lg font-bold leading-none">
                  4.9★
                </div>
                <div className="mt-1 text-[9px] font-bold text-white/60 uppercase tracking-widest">
                  Valoración
                </div>
              </div>
              <div className="flex-1 py-4 text-center">
                <div className="font-heading text-lg font-bold leading-none">
                  1.2K
                </div>
                <div className="mt-1 text-[9px] font-bold text-white/60 uppercase tracking-widest">
                  Clientes
                </div>
              </div>
            </div>
          </header>

          <main className="pb-24">
            {/* SEARCH BAR */}
            <section className="px-4 pt-5 pb-2">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 shadow-sm focus-within:border-[var(--accent)] transition-colors group">
                <span className="text-xl opacity-30 group-focus-within:opacity-100 transition-opacity">🔍</span>
                <input
                  type="search"
                  placeholder="Buscar en el catálogo..."
                  className="flex-1 border-none bg-transparent text-sm font-medium text-[var(--dark)] outline-none placeholder:text-[var(--muted)]"
                />
                <span className="rounded-lg bg-[var(--surface2)] px-2 py-1 text-lg leading-none cursor-pointer">
                  🎛
                </span>
              </div>
            </section>

            {/* CATEGORIES */}
            <section className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
              {['Todo', 'Novedades', 'Ofertas 🔥', 'Calzado', 'Accesorios'].map((cat, i) => (
                <button
                  key={cat}
                  className={`whitespace-nowrap rounded-full border-2 px-4 py-1.5 text-xs font-bold transition-all ${
                    i === 0
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg shadow-orange-950/20'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground2)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </section>

            {/* PROMO BANNER */}
            <section className="px-4 pt-3">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1e2e] to-[#2d1a00] p-5 text-white shadow-xl group cursor-pointer active:scale-[0.98] transition-transform">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-5xl opacity-20 group-hover:scale-110 transition-transform">🎁</div>
                <span className="inline-block rounded bg-[var(--accent)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest mb-2">
                  Oferta Especial
                </span>
                <h2 className="font-heading text-xl font-bold leading-tight">
                  2x1 en toda la<br />
                  <span className="text-[var(--accent-secondary)]">ropa de temporada</span>
                </h2>
                <p className="mt-1 text-[11px] text-white/60 font-medium">
                  Solo hasta el viernes · Corre 👟
                </p>
              </div>
            </section>

            {/* PAY STRIP */}
            <section className="px-4 pt-4">
              <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-4">
                 <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-3">💳 Métodos de pago aceptados</div>
                 <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/20 bg-purple-500/5 px-2.5 py-1.5 text-[10px] font-bold text-purple-600">
                        💸 Zelle
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/5 px-2.5 py-1.5 text-[10px] font-bold text-blue-600">
                        📱 Pago Móvil
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-yellow-600/20 bg-yellow-600/5 px-2.5 py-1.5 text-[10px] font-bold text-yellow-700">
                        ⚡ Binance
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-[10px] font-bold text-emerald-600">
                        💵 Efectivo
                    </span>
                 </div>
              </div>
            </section>

            {/* PRODUCT GRID */}
            <section className="px-4 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold">
                  🔥 Más vendidos
                </h2>
                <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-tight cursor-pointer">
                  Ver todos
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {products.map((product, idx) => (
                  <article
                    key={product.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl bg-[var(--surface)] shadow-sm ring-1 ring-[var(--border)] transition-all duration-200 active:scale-95"
                  >
                    <div className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)]/90 text-xs shadow-md backdrop-blur-sm cursor-pointer hover:bg-[var(--surface)] transition-colors">
                      🤍
                    </div>
                    {product.stock && product.stock < 10 && (
                        <div className="absolute left-2.5 top-2.5 z-10 bg-[var(--accent)] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm">
                            ÚLTIMOS {product.stock}
                        </div>
                    )}
                    <div className="aspect-[4/5] bg-[var(--surface2)] group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                      {product.images && product.images.length > 0 ? (
                        <div className="relative h-full w-full">
                          <Image
                            src={resolveImageUrl(product.images[0])}
                            alt={product.name}
                            fill
                            className="object-cover"
                            unoptimized
                            loading={idx === 0 ? 'eager' : 'lazy'}
                          />
                          {product.images.length > 1 && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 rounded-full bg-[var(--surface)]/80 px-1.5 py-1 shadow-sm">
                              {product.images.slice(0, 3).map((src, idx) => (
                                <div
                                  key={idx}
                                  className="relative h-6 w-6 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]"
                                >
                                  <Image
                                    src={resolveImageUrl(src)}
                                    alt={`${product.name} ${idx + 1}`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              ))}
                              {product.images.length > 3 && (
                                <div className="flex h-6 items-center px-1 text-[9px] font-bold text-[var(--foreground2)]">
                                  +{product.images.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-6xl">
                          {product.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <h3 className="line-clamp-1 font-heading text-[14px] font-bold text-[var(--dark)]">
                        {product.name}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-[var(--muted)]">
                        {product.description || 'Sin descripción'}
                      </p>
                      <div className="mt-auto pt-3 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <DualPrice
                            usdCents={product.priceUsdCents}
                            businessId={business.id}
                            showBoth={showBs}
                          />
                        </div>
                        <Link
                          href={`/${slug}/products/${product.id}`}
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-xl font-light text-white shadow-[0_4px_12px_rgba(232,54,14,0.35)] active:translate-y-0.5 transition-all"
                        >
                          +
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>

      {showChatButton && cleanedWhatsapp && (
        <a
          href={`https://wa.me/${cleanedWhatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg transition-colors hover:bg-emerald-600"
        >
          <svg
            className="h-8 w-8 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.08.58 4.12 1.69 5.88L2 22l4.33-1.76c1.72.98 3.7 1.5 5.71 1.5 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm.01 18.16c-1.76 0-3.48-.5-4.97-1.44l-.36-.22-2.73 1.12.94-2.58-.23-.38c-1.03-1.6-1.58-3.46-1.58-5.39 0-4.58 3.74-8.32 8.32-8.32s8.32 3.74 8.32 8.32-3.73 8.33-8.31 8.33z" />
            <path d="M16.58 13.98c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.28-.71.88-.87 1.06-.16.18-.32.2-.59.07-1.23-.6-2.07-1.11-2.88-2.29-.22-.31-.02-.48.16-.66.16-.16.36-.42.54-.64.18-.22.24-.37.36-.62.12-.25.06-.47-.03-.66-.09-.19-.61-1.47-.84-2.01-.22-.52-.45-.45-.61-.46h-.52c-.18 0-.47.07-.72.35-.25.28-.95.93-.95 2.27 0 1.34.98 2.64 1.12 2.82.14.18 1.9 2.96 4.68 4.02 2.78 1.06 2.78.71 3.28.67.5-.04 1.61-.66 1.84-1.29.23-.63.23-1.17.16-1.29-.07-.12-.25-.19-.52-.33z" />
          </svg>
        </a>
      )}
    </>
  );
}
