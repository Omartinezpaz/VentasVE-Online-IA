import { catalogApi } from '@/lib/api/catalog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CartLink } from './CartLink';
import { DualPrice } from '@/components/ui/DualPrice';

type CatalogPageProps = {
  params: {
    slug: string;
  };
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
};

export default async function CatalogPage({ params }: CatalogPageProps) {
  const { slug } = params;

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
  const showStock = business.catalogOptions?.showStock ?? false;
   const showChatButton = business.catalogOptions?.showChatButton ?? true;
  const cleanedWhatsapp = business.whatsapp?.replace(/\D/g, '') ?? '';

  return (
    <>
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <div className="mx-auto min-h-screen max-w-md bg-zinc-50">
          <header className="relative overflow-hidden bg-zinc-900 text-white">
            <div className="px-4 pt-4 pb-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-lg">
                  <span>‹</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-lg">
                    <span>⋯</span>
                  </div>
                  <CartLink slug={slug} />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-2xl font-semibold shadow-lg">
                  {business.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold leading-tight">
                    {business.name}
                  </div>
                  {business.description && (
                    <p className="mt-1 text-xs text-zinc-200/70 line-clamp-2">
                      {business.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-100">
                      Verificado
                    </span>
                    <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                      Entrega rápida
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex border-t border-white/10">
              <div className="flex-1 border-r border-white/10 px-3 py-3 text-center">
                <div className="text-sm font-semibold text-white">
                  {products.length}
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-300">
                  Productos
                </div>
              </div>
              <div className="flex-1 border-r border-white/10 px-3 py-3 text-center">
                <div className="text-sm font-semibold text-white">
                  USD / Bs
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-300">
                  Doble moneda
                </div>
              </div>
              <div className="flex-1 px-3 py-3 text-center">
                <div className="text-sm font-semibold text-white">
                  WhatsApp
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-300">
                  Pedidos directos
                </div>
              </div>
            </div>
          </header>

          <main className="pb-20">
            <section className="border-b border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-zinc-700">
                  Métodos de pago:
                </span>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-[rgba(118,72,232,0.3)] bg-[rgba(118,72,232,0.06)] px-2 py-1 text-[11px] font-semibold text-[#7648e8]">
                    <span>●</span>
                    <span>Zelle</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.06)] px-2 py-1 text-[11px] font-semibold text-[#3b82f6]">
                    <span>●</span>
                    <span>Pago móvil</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-[rgba(245,188,9,0.35)] bg-[rgba(245,188,9,0.06)] px-2 py-1 text-[11px] font-semibold text-[#c49500]">
                    <span>●</span>
                    <span>Binance Pay</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-[rgba(26,158,92,0.3)] bg-[rgba(26,158,92,0.06)] px-2 py-1 text-[11px] font-semibold text-[#1a9e5c]">
                    <span>●</span>
                    <span>Efectivo USD</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-[rgba(232,54,14,0.25)] bg-[rgba(232,54,14,0.05)] px-2 py-1 text-[11px] font-semibold text-[#e8360e]">
                    <span>●</span>
                    <span>Transferencia Bs</span>
                  </span>
                </div>
              </div>
            </section>

            <section className="px-4 pt-4">
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
                <span className="text-lg text-zinc-400">⌕</span>
                <input
                  type="search"
                  placeholder="Buscar productos..."
                  className="h-6 flex-1 border-none bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
                />
                <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600">
                  Filtros
                </span>
              </div>
            </section>

            <section className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1 pt-2 text-sm">
              <button className="whitespace-nowrap rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs font-medium text-white shadow">
                Todo
              </button>
              <button className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                Nuevos
              </button>
              <button className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                Ofertas
              </button>
              <button className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                Más vendidos
              </button>
            </section>

            <section className="px-4 pt-4">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 px-4 py-4 text-white shadow">
                <span className="inline-flex rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Promo del día
                </span>
                <h2 className="mt-2 text-base font-semibold">
                  Envíos rápidos y pagos en
                  <span className="text-amber-300"> USD o Bs</span>
                </h2>
                <p className="mt-1 text-xs text-zinc-300">
                  Elige tus piezas favoritas y paga en la moneda que prefieras.
                </p>
              </div>
            </section>

            <section className="px-4 pt-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Colección destacada
                </h2>
                <span className="text-xs font-medium text-orange-600">
                  Ver todo
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-4">
                {products.map(product => (
                  <article
                    key={product.id}
                    className="relative overflow-hidden rounded-2xl bg-white shadow-sm transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs text-zinc-700 shadow">
                      ♥
                    </div>
                    <div className="flex h-32 items-center justify-center bg-zinc-100 text-4xl text-zinc-300">
                      {product.name.charAt(0)}
                    </div>
                    <div className="px-3 pb-3 pt-2">
                      <h3 className="line-clamp-2 text-[13px] font-semibold text-zinc-900">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">
                          {product.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-end justify-between gap-2">
                        <div className="text-[12px]">
                          <DualPrice
                            usdCents={product.priceUsdCents}
                            businessId={business.id}
                            showBoth={showBs}
                          />
                          {showStock && typeof product.stock === 'number' && (
                            <p className="mt-1 text-[10px] text-zinc-500">
                              Stock: {product.stock}
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/${slug}/products/${product.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-lg font-medium text-white shadow-md"
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
