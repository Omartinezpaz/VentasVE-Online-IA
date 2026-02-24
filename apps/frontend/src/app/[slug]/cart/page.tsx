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
    <div className="min-h-screen bg-[var(--bg-light)] text-[var(--dark)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href={`/${slug}`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface2)] text-lg cursor-pointer">
            <span>‹</span>
          </Link>
          <div className="text-center">
            <h1 className="font-heading text-lg font-bold tracking-tight">
              🛒 Tu pedido
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              Paso 1 de 2
            </p>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="grid gap-6 md:grid-cols-[1fr,0.7fr]">
          <section className="space-y-4">
            <div className="flex flex-col gap-3">
              {items.map(item => (
                <article
                  key={item.productId}
                  className="flex items-center gap-4 rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]"
                >
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--bg-light)] text-2xl font-bold text-[var(--muted)]">
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[14px] font-bold text-[var(--dark)] truncate">
                      {item.name}
                    </h2>
                    <div className="mt-1">
                      <DualPrice usdCents={item.priceUsdCents} showBoth />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                     <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="text-[18px] text-[var(--muted)] hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    <div className="flex items-center gap-2 bg-[var(--bg-light)] rounded-lg p-1">
                       <button onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))} className="w-6 h-6 flex items-center justify-center font-bold text-[var(--foreground2)] hover:text-[var(--dark)] transition-colors">−</button>
                       <span className="font-heading font-bold text-sm min-w-[20px] text-center">{item.quantity}</span>
                       <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center font-bold text-[var(--foreground2)] hover:text-[var(--dark)] transition-colors">+</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <Link
                href={`/${slug}`}
                className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-[var(--accent)] uppercase tracking-tight"
            >
                + Agregar más productos
            </Link>
          </section>

          <section className="space-y-4">
             <div className="rounded-[24px] bg-[var(--surface)] p-6 shadow-xl ring-1 ring-[var(--border)]">
                <h2 className="font-heading text-lg font-bold mb-5">
                    Resumen de pago
                </h2>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium text-[var(--foreground2)]">
                        <span>Subtotal</span>
                        <DualPrice usdCents={totalCents} />
                    </div>
                    <div className="flex justify-between text-sm font-medium text-[var(--foreground2)]">
                        <span>Envío Caracas</span>
                        <span className="text-emerald-600 font-bold">Gratis</span>
                    </div>
                    <div className="pt-4 mt-2 border-t-2 border-dashed border-[var(--border)] flex justify-between items-end">
                        <span className="font-heading text-lg font-bold">Total</span>
                        <div className="text-right">
                            <div className="font-heading text-2xl font-bold text-[var(--accent)]">
                                <DualPrice usdCents={totalCents} showBoth />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 rounded-2xl bg-[var(--bg-light)] p-4">
                    <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-tight mb-2">💳 ¿Cómo vas a pagar?</div>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 rounded-lg border-2 border-[var(--accent)] bg-[var(--accent)]/5 text-[11px] font-bold text-[var(--accent)]">💸 Zelle</span>
                        <span className="px-3 py-1.5 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] text-[11px] font-bold text-[var(--foreground2)]">📱 Pago Móvil</span>
                    </div>
                </div>

                <Link
                href={`/${slug}/checkout`}
                className="mt-8 block w-full rounded-2xl bg-[#1a1e2e] py-4 text-center font-heading text-base font-bold text-white shadow-xl shadow-zinc-950/20 active:scale-[0.98] transition-all"
                >
                Confirmar datos →
                </Link>
             </div>
          </section>
        </div>
      </main>
    </div>
  );
}
