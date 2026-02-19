'use client';

import Link from 'next/link';
import { useCart } from '@/lib/hooks/useCart';
import { DualPrice } from '@/components/ui/DualPrice';

type CartPageProps = {
  params: {
    slug: string;
  };
};

export default function CartPage({ params }: CartPageProps) {
  const { slug } = params;
  const { items, updateQuantity, removeItem, totalCents } = useCart(slug);

  const handleQuantityChange = (productId: string, value: string) => {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return;
    }
    updateQuantity(productId, quantity);
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgba(245,200,66,0.08),_transparent_55%),_radial-gradient(ellipse_at_bottom,_rgba(79,142,247,0.07),_transparent_55%),_#050712] text-zinc-50">
        <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/80 p-6 shadow-2xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-lg">
              <span>🧺</span>
            </div>
            <div>
              <h1 className="text-base font-semibold">
                Tu carrito está vacío
              </h1>
              <p className="text-xs text-zinc-400">
                Agrega productos desde el catálogo para empezar tu pedido.
              </p>
            </div>
          </div>
          <Link
            href={`/${slug}`}
            className="mt-3 block w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-center text-sm font-semibold text-black shadow-md shadow-[rgba(0,0,0,0.5)]"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_20%_0%,_rgba(245,200,66,0.07),_transparent_55%),_radial-gradient(ellipse_at_80%_100%,_rgba(79,142,247,0.06),_transparent_55%),_#050712] text-zinc-50">
      <header className="border-b border-zinc-800 bg-zinc-950/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Paso 1 de 2 · Tu carrito
            </p>
            <h1 className="font-heading text-lg font-semibold tracking-tight">
              Resumen del carrito
            </h1>
          </div>
          <Link
            href={`/${slug}`}
            className="text-xs font-medium text-zinc-400 underline"
          >
            Seguir comprando
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-5">
        <div className="grid gap-4 md:grid-cols-[2.2fr,1.4fr]">
          <section className="card-elevated rounded-2xl border border-zinc-800 bg-zinc-950/80">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="font-heading text-sm font-semibold text-zinc-50">
                Productos en tu pedido
              </h2>
              <p className="text-xs text-zinc-500">
                Ajusta cantidades o quita productos antes de continuar.
              </p>
            </div>
            <div className="px-5 py-4">
              <div className="space-y-3">
                {items.map(item => (
                  <article
                    key={item.productId}
                    className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-sm text-zinc-300">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-sm font-medium text-zinc-100">
                        {item.name}
                      </h2>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        <DualPrice usdCents={item.priceUsdCents} showBoth />
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={event =>
                            handleQuantityChange(item.productId, event.target.value)
                          }
                          className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="text-[11px] font-medium text-red-400"
                      >
                        Quitar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
          <section className="card-elevated flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950/80 px-5 py-4">
            <div>
              <h2 className="font-heading text-sm font-semibold text-zinc-50">
                Resumen de pago
              </h2>
              <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                <span>Subtotal estimado</span>
                <span className="font-heading text-sm text-[var(--accent)]">
                  <DualPrice usdCents={totalCents} showBoth />
                </span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                El monto final se confirmará por WhatsApp según el método de pago elegido.
              </p>
            </div>
            <Link
              href={`/${slug}/checkout`}
              className="mt-4 block w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-center text-sm font-semibold text-black shadow-md shadow-[rgba(0,0,0,0.6)]"
            >
              Ir al checkout
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
