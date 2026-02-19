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
  const [orderId, setOrderId] = useState<string | null>(null);

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
      const res = await catalogApi.createOrder(slug, payload);
      setOrderId(res.data.id);
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
      <div className="min-h-screen bg-[var(--bg-light)] text-[var(--dark)]">
        <div className="mx-auto max-w-lg px-4 pb-24 pt-12">
          <div className="text-center mb-10">
             <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-4xl text-white shadow-xl shadow-emerald-500/20 mb-6 scale-animation">
                ✓
             </div>
             <h1 className="font-heading text-3xl font-bold tracking-tight mb-2">¡Pedido enviado!</h1>
             <p className="text-zinc-500 text-sm font-medium">Hemos recibido tu solicitud correctamente.</p>
          </div>

          <div className="space-y-4">
             <div className="bg-white rounded-[24px] p-6 shadow-xl ring-1 ring-black/5">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Estado del pedido</div>
                <div className="space-y-6 relative">
                    <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-zinc-100" />

                    <div className="relative flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex-shrink-0 z-10 border-4 border-white flex items-center justify-center text-[10px] text-white font-bold">1</div>
                        <div>
                            <div className="text-sm font-bold">Pedido Recibido</div>
                            <div className="text-[11px] text-zinc-400 mt-0.5 font-medium">ID: #{orderId?.slice(-6).toUpperCase() || 'ABC123'} · Hace 1 min</div>
                        </div>
                    </div>

                    <div className="relative flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex-shrink-0 z-10 border-4 border-white flex items-center justify-center text-[10px] text-zinc-400 font-bold">2</div>
                        <div>
                            <div className="text-sm font-bold text-zinc-400">Verificación de Pago</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5 font-medium italic">Esperando comprobante por WhatsApp...</div>
                        </div>
                    </div>

                    <div className="relative flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex-shrink-0 z-10 border-4 border-white flex items-center justify-center text-[10px] text-zinc-400 font-bold">3</div>
                        <div>
                            <div className="text-sm font-bold text-zinc-400">Preparación y Envío</div>
                        </div>
                    </div>
                </div>
             </div>

             <div className="bg-[var(--dark)] rounded-[24px] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[var(--accent)]/20 rounded-full blur-3xl" />
                <h3 className="font-heading text-xl font-bold mb-2">Siguiente paso:</h3>
                <p className="text-white/60 text-sm mb-6 leading-relaxed">Envía el capture de tu pago al WhatsApp del negocio para agilizar la entrega.</p>

                <div className="flex flex-col gap-3">
                    <button className="w-full bg-[#25D366] hover:bg-[#20ba5a] py-4 rounded-2xl font-heading font-bold flex items-center justify-center gap-3 shadow-lg shadow-[#25D366]/20 transition-all active:scale-95">
                        <span className="text-xl">💬</span>
                        Enviar comprobante
                    </button>
                    <button onClick={() => router.push(`/${slug}`)} className="w-full bg-white/10 hover:bg-white/20 py-4 rounded-2xl font-heading font-bold text-sm transition-all">
                        Seguir comprando
                    </button>
                </div>
             </div>
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
