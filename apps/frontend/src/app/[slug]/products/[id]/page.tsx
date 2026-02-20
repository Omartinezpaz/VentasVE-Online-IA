'use client';

import { useEffect, useState } from 'react';
import { catalogApi, PublicOrderPayload, PublicPaymentMethod } from '@/lib/api/catalog';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/hooks/useCart';
import { DualPrice } from '@/components/ui/DualPrice';

type ProductPageProps = {
  params: {
    slug: string;
    id: string;
  };
};

type Product = {
  id: string;
  name: string;
  description?: string | null;
  priceUsdCents: number;
};

type Business = {
  name: string;
};

const FALLBACK_PAYMENT_METHODS = [
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'PAGO_MOVIL', label: 'Pago Móvil' },
  { value: 'BINANCE', label: 'Binance' },
  { value: 'CASH_USD', label: 'Efectivo USD' },
  { value: 'TRANSFER_BS', label: 'Transferencia Bs.' },
  { value: 'CRYPTO', label: 'Crypto' }
];

export default function ProductCheckoutPage({ params }: ProductPageProps) {
  const { slug, id } = params;
  const router = useRouter();
  const { addItem } = useCart(slug);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
   const [paymentMethods, setPaymentMethods] = useState<PublicPaymentMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('ZELLE');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [businessRes, productRes, methodsRes] = await Promise.all([
          catalogApi.getBusiness(slug),
          catalogApi.getProduct(slug, id),
          catalogApi.getPaymentMethods(slug),
        ]);
        setBusiness(businessRes.data);
        setProduct(productRes.data);
        setPaymentMethods(methodsRes.data);
        if (methodsRes.data.length > 0) {
          setPaymentMethod(methodsRes.data[0].code);
        }
      } catch {
        setError('No se pudo cargar el producto');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug, id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!product) return;
    if (!phone) {
      setError('El teléfono es obligatorio');
      return;
    }
    if (quantity <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: PublicOrderPayload = {
      customer: {
        phone,
        name: name || undefined,
        address: address || undefined
      },
      items: [
        {
          productId: product.id,
          quantity
        }
      ],
      paymentMethod,
      notes: notes || undefined
    };

    try {
      await catalogApi.createOrder(slug, payload);
      setSuccess(true);
    } catch {
      setError('No se pudo crear el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (quantity <= 0) return;
    addItem({
      productId: product.id,
      name: product.name,
      priceUsdCents: product.priceUsdCents,
      quantity
    });
    router.push(`/${slug}/cart`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-600">Cargando...</p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="rounded-lg bg-white px-6 py-4 shadow">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!product || !business) {
    return null;
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="mx-4 max-w-md rounded-lg bg-white px-6 py-5 shadow">
          <h1 className="text-lg font-semibold">Pedido recibido</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Hemos registrado tu pedido. El negocio se pondrá en contacto contigo para confirmar el pago.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/${slug}`)}
            className="mt-4 w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50"
          >
            Volver al catálogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Pedido en
          </span>
          <h1 className="text-xl font-semibold">{business.name}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="grid gap-6 md:grid-cols-[2fr,3fr]">
          <section className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-medium">{product.name}</h2>
            {product.description && (
              <p className="mt-1 text-sm text-zinc-600">{product.description}</p>
            )}
            <p className="mt-3 text-base">
              <DualPrice usdCents={product.priceUsdCents} />
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700">
                Cantidad
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={event => setQuantity(Number(event.target.value))}
                className="mt-1 w-24 rounded border px-2 py-1 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="mt-4 w-full rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800"
            >
              Añadir al carrito
            </button>
          </section>
          <section className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-medium">Tus datos</h2>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  placeholder="Ej: 0414-0000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Nombre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Dirección
                </label>
                <textarea
                  value={address}
                  onChange={event => setAddress(event.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Método de pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={event => setPaymentMethod(event.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                >
                  {(paymentMethods.length > 0
                    ? paymentMethods.map(method => ({ value: method.code, label: method.name }))
                    : FALLBACK_PAYMENT_METHODS
                  ).map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Opcional"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 disabled:opacity-70"
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
