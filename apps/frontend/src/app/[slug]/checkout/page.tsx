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
    <div className="min-h-screen bg-[var(--bg-light)] text-[var(--dark)]">
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href={`/${slug}/cart`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 text-lg cursor-pointer">
            <span>‹</span>
          </Link>
          <div className="text-center">
            <h1 className="font-heading text-lg font-bold tracking-tight">
              ✅ Confirmar
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Paso 2 de 2
            </p>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr,0.7fr]">
          <section className="space-y-6">
            <div className="rounded-[24px] bg-white p-6 shadow-xl ring-1 ring-black/5">
                <h2 className="font-heading text-lg font-bold mb-5 flex items-center gap-2">
                   <span className="text-lg">👤</span> Tus datos
                </h2>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Nombre completo</label>
                            <input
                                type="text"
                                value={name}
                                onChange={event => setName(event.target.value)}
                                className="w-full rounded-xl border-2 border-black/5 bg-[var(--bg-light)] px-4 py-3 text-sm font-medium outline-none focus:border-[var(--accent)] transition-all"
                                placeholder="Ej: Juan Pérez"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">WhatsApp</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={event => setPhone(event.target.value)}
                                className="w-full rounded-xl border-2 border-black/5 bg-[var(--bg-light)] px-4 py-3 text-sm font-medium outline-none focus:border-[var(--accent)] transition-all"
                                placeholder="Ej: 0412 1234567"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Dirección de entrega</label>
                        <textarea
                            value={address}
                            onChange={event => setAddress(event.target.value)}
                            className="w-full rounded-xl border-2 border-black/5 bg-[var(--bg-light)] px-4 py-3 text-sm font-medium outline-none focus:border-[var(--accent)] transition-all min-h-[80px] resize-none"
                            placeholder="Calle, edificio, apto..."
                        />
                    </div>

                    <div className="pt-4 border-t border-black/5 mt-4">
                        <h3 className="text-sm font-bold mb-4">Método de pago</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {paymentMethods.map(method => (
                                <button
                                    key={method.value}
                                    type="button"
                                    onClick={() => setPaymentMethod(method.value)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                                        paymentMethod === method.value
                                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]'
                                        : 'border-black/5 bg-white text-zinc-500'
                                    }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === method.value ? 'border-[var(--accent)]' : 'border-zinc-300'}`}>
                                        {paymentMethod === method.value && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                                    </div>
                                    <span className="text-xs font-bold">{method.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full mt-6 rounded-2xl bg-[var(--dark)] py-4 text-center font-heading text-lg font-bold text-white shadow-xl shadow-zinc-950/20 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {submitting ? 'Procesando...' : 'Finalizar pedido · ' + (totalCents / 100).toFixed(2) + '$'}
                    </button>
                </form>
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
            <div className="rounded-[24px] bg-white p-6 shadow-xl ring-1 ring-black/5">
                <h2 className="font-heading text-sm font-bold mb-4 uppercase tracking-wider text-zinc-400">
                    Tu carrito
                </h2>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                    {items.map(item => (
                        <div key={item.productId} className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-[var(--bg-light)] flex items-center justify-center font-bold text-zinc-400 flex-shrink-0">
                                {item.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold truncate">{item.name}</div>
                                <div className="text-[10px] text-zinc-400 font-bold">x{item.quantity}</div>
                            </div>
                            <div className="text-xs font-bold">
                                <DualPrice usdCents={item.priceUsdCents * item.quantity} />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-4 border-t border-black/5">
                    <div className="flex justify-between items-center">
                        <span className="font-heading text-base font-bold">Total</span>
                        <div className="text-right">
                             <DualPrice usdCents={totalCents} showBoth className="text-lg font-bold text-[var(--accent)]" />
                        </div>
                    </div>
                </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
