'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/hooks/useCart';
import { catalogApi, PublicOrderPayload } from '@/lib/api/catalog';
import Link from 'next/link';
import { DualPrice } from '@/components/ui/DualPrice';

type CheckoutPageProps = {
  params: {
    slug: string;
  };
};

const paymentMethods = [
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'PAGO_MOVIL', label: 'Pago Móvil' },
  { value: 'BINANCE', label: 'Binance' },
  { value: 'CASH_USD', label: 'Efectivo USD' },
  { value: 'TRANSFER_BS', label: 'Transferencia Bs.' },
  { value: 'CRYPTO', label: 'Crypto' }
];

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = params;
  const router = useRouter();
  const { items, totalCents, clearCart } = useCart(slug);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [identification, setIdentification] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ZELLE');
  const [notes, setNotes] = useState('');
  const [preferredPayment, setPreferredPayment] = useState('ZELLE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (items.length === 0 && !success) {
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
                Agrega productos desde el catálogo para continuar al checkout.
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!phone) {
      setError('El teléfono es obligatorio');
      return;
    }
    if (items.length === 0) {
      setError('Tu carrito está vacío');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: PublicOrderPayload = {
      customer: {
        phone,
        name: name || undefined,
        address: address || undefined,
        email: email || undefined,
        addressNotes: addressNotes || undefined,
        identification: identification || undefined,
        preferences: {
          preferredPayment,
          deliveryInstructions: addressNotes || undefined
        }
      },
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      paymentMethod,
      notes: notes || undefined
    };

    try {
      await catalogApi.createOrder(slug, payload);
      clearCart();
      setSuccess(true);
    } catch {
      setError('No se pudo crear el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_20%_0%,_rgba(245,200,66,0.07),_transparent_55%),_radial-gradient(ellipse_at_80%_100%,_rgba(79,142,247,0.06),_transparent_55%),_#050712] text-zinc-50">
        <div className="mx-auto max-w-4xl px-4 pb-16 pt-20">
          <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-zinc-950/60 px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="success-ring flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/10 text-2xl text-emerald-400">
                ✓
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Pedido recibido
                </div>
                <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
                  Gracias por tu pedido
                </h1>
                <p className="mt-1 text-xs text-zinc-400">
                  Hemos registrado tu pedido. El negocio se pondrá en contacto contigo por WhatsApp para confirmar el pago.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[2.1fr,1.4fr]">
            <section className="card-elevated rounded-2xl border border-zinc-800 bg-zinc-950/80">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <div>
                  <h2 className="font-heading text-sm font-semibold text-zinc-50">
                    Resumen de tu pedido
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Guarda esta información para enviar tu comprobante de pago.
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                  <div>Total aprobado</div>
                  <div className="mt-0.5 font-heading text-lg font-semibold text-[var(--accent)]">
                    <DualPrice usdCents={totalCents} showBoth />
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 text-xs text-zinc-400">
                <p>
                  Revisa WhatsApp: recibirás un mensaje con los datos para pagar y el estado de tu pedido.
                </p>
              </div>
            </section>

            <section className="card-elevated rounded-2xl border border-zinc-800 bg-zinc-950/80 px-5 py-4">
              <h2 className="font-heading text-sm font-semibold text-zinc-50">
                ¿Qué sigue?
              </h2>
              <ol className="mt-3 space-y-2 text-xs text-zinc-400">
                <li>1. El negocio revisa tu pedido.</li>
                <li>2. Te envían los datos de pago por WhatsApp.</li>
                <li>3. Envías comprobante con referencia.</li>
                <li>4. Te confirman cuando el pago esté verificado.</li>
              </ol>
              <button
                type="button"
                onClick={() => router.push(`/${slug}`)}
                className="mt-4 w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-black shadow-md shadow-[rgba(0,0,0,0.6)]"
              >
                Volver al catálogo
              </button>
            </section>
          </div>
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
              Paso 2 de 2 · Confirmar pedido
            </p>
            <h1 className="font-heading text-lg font-semibold tracking-tight">
              Checkout
            </h1>
          </div>
          <div className="rounded-full border border-[var(--accent)]/40 bg-zinc-950/80 px-3 py-1 text-xs">
            <span className="mr-1 text-zinc-400">Total:</span>
            <span className="font-heading text-[var(--accent)]">
              <DualPrice usdCents={totalCents} showBoth />
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-5">
        <div className="grid gap-4 md:grid-cols-[2fr,2.2fr]">
          <section className="card-elevated rounded-2xl border border-zinc-800 bg-zinc-950/80">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="font-heading text-sm font-semibold text-zinc-50">
                  Resumen del carrito
                </h2>
                <p className="text-xs text-zinc-500">
                  Revisa los productos y cantidades antes de confirmar.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 text-xs">
              <div className="space-y-3">
                {items.map(item => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-sm text-zinc-300">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-zinc-100">
                        {item.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-500">
                        Cantidad: {item.quantity}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <DualPrice
                        usdCents={item.priceUsdCents * item.quantity}
                        showBoth
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="card-elevated rounded-2xl border border-zinc-800 bg-zinc-950/80">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="font-heading text-sm font-semibold text-zinc-50">
                Tus datos
              </h2>
              <p className="text-xs text-zinc-500">
                Usa tu número de WhatsApp para recibir confirmación del pedido.
              </p>
            </div>
            <form className="px-5 py-4 text-xs" onSubmit={handleSubmit}>
              <div>
                <label className="block text-[11px] font-medium text-zinc-300">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Ej: 0414-0000000"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-300">
                  Nombre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-300">
                  Dirección
                </label>
                <textarea
                  value={address}
                  onChange={event => setAddress(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  rows={2}
                  placeholder="Opcional"
                />
              </div>
              <details className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs">
                <summary className="cursor-pointer text-[11px] font-semibold text-zinc-200">
                  Completar perfil para pedidos más rápidos
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                      placeholder="para enviarte factura o confirmación"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300">
                      Cédula / RIF
                    </label>
                    <input
                      type="text"
                      value={identification}
                      onChange={event => setIdentification(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                      placeholder="V-12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300">
                      Referencias de entrega
                    </label>
                    <input
                      type="text"
                      value={addressNotes}
                      onChange={event => setAddressNotes(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                      placeholder="Edificio, piso, punto de referencia"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300">
                      Método de pago preferido
                    </label>
                    <select
                      value={preferredPayment}
                      onChange={event => setPreferredPayment(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                    >
                      {paymentMethods.map(method => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </details>
              <div>
                <label className="block text-[11px] font-medium text-zinc-300">
                  Método de pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={event => setPaymentMethod(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                >
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-300">
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  rows={2}
                  placeholder="Opcional"
                />
              </div>
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="mt-3 w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-black shadow-md shadow-[rgba(0,0,0,0.6)] disabled:opacity-70"
              >
                {submitting ? 'Enviando pedido...' : 'Confirmar pedido'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
