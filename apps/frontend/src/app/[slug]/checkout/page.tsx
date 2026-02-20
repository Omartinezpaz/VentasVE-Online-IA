'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/hooks/useCart';
import { catalogApi, PublicOrderPayload, DocumentType, PublicPaymentMethod, PublicPaymentConfig } from '@/lib/api/catalog';
import Link from 'next/link';
import { DualPrice } from '@/components/ui/DualPrice';
import { maskEmail, maskPhone, maskId } from '@/lib/mask';

type CheckoutPageProps = {
  params: {
    slug: string;
  };
};
const FALLBACK_PAYMENT_METHODS = [
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

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  // Document identification split: type + number
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [docType, setDocType] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PublicPaymentMethod[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PublicPaymentConfig | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('ZELLE');
  const [notes, setNotes] = useState('');
  const [preferredPayment, setPreferredPayment] = useState('ZELLE');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [proofName, setProofName] = useState('');
  const [proofSize, setProofSize] = useState('');
  const [checkReviewedOrder, setCheckReviewedOrder] = useState(false);
  const [checkSentReceipt, setCheckSentReceipt] = useState(false);
  const [checkOnWhatsapp, setCheckOnWhatsapp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Load document types, available payment methods and payment config once
  useEffect(() => {
    let mounted = true;
    Promise.all([
      catalogApi.getDocumentTypes(),
      catalogApi.getPaymentMethods(slug),
      catalogApi.getPaymentConfig(slug),
    ])
      .then(([docRes, pmRes, cfgRes]) => {
        if (!mounted) return;
        setDocumentTypes(docRes.data);
        if (docRes.data.length > 0) {
          setDocType(docRes.data[0].codigo);
        }
        setAvailablePaymentMethods(pmRes.data);
        if (pmRes.data.length > 0) {
          setPaymentMethod(pmRes.data[0].code);
          setPreferredPayment(pmRes.data[0].code);
        }
        setPaymentConfig(cfgRes.data);
      })
      .catch(() => {
        // silently ignore; both fields are optional / have fallback
      });
    return () => { mounted = false; };
  }, [slug]);

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

  const submitOrder = async () => {
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

    const composedId = docType && docNumber ? `${docType}-${docNumber}` : undefined;

    const payload: PublicOrderPayload = {
      customer: {
        phone,
        name: name || undefined,
        address: address || undefined,
        email: email || undefined,
        addressNotes: addressNotes || undefined,
        identification: composedId,
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

  const steps = [
    { id: 1, label: 'Resumen' },
    { id: 2, label: 'Datos de entrega' },
    { id: 3, label: 'Método de pago' },
    { id: 4, label: 'Comprobante' },
    { id: 5, label: 'Confirmación' },
  ];

  const getPaymentDetails = (method: string) => {
    const amountRow = { id: 'amount', label: 'Monto', value: `$${(totalCents / 100).toFixed(2)}` };
    const cfg = paymentConfig;

    const hasRealConfig =
      !!(cfg?.zelle?.email ||
        cfg?.pagoMovil?.phone ||
        cfg?.binance?.id ||
        cfg?.transfer?.account);

    if (!hasRealConfig && method !== 'CASH_USD') {
      return {
        icon: '💬',
        title: 'Coordinar pago por WhatsApp',
        rows: [
          {
            id: 'wa-note',
            label: 'Instrucciones',
            value: 'El vendedor te enviará los datos de pago por WhatsApp luego de confirmar tu pedido.',
          },
          amountRow,
        ],
      };
    }

    if (method === 'ZELLE') {
      const emailRaw = cfg?.zelle?.email || 'tu-zelle@correo.com';
      const email = cfg?.zelle?.email ? maskEmail(emailRaw) : emailRaw;
      const name = cfg?.zelle?.name || 'Nombre del titular';
      return {
        icon: '💸',
        title: 'Pagar con Zelle',
        rows: [
          { id: 'zelle-email', label: 'Email o teléfono', value: email },
          { id: 'zelle-name', label: 'Nombre del titular', value: name },
          amountRow,
        ],
      };
    }

    if (method === 'PAGO_MOVIL') {
      const phoneRaw = cfg?.pagoMovil?.phone || '0412-0000000';
      const phone = cfg?.pagoMovil?.phone ? maskPhone(phoneRaw) : phoneRaw;
      const bank = cfg?.pagoMovil?.bank || 'Banco';
      const idRaw = cfg?.pagoMovil?.id || 'V-00.000.000';
      const id = cfg?.pagoMovil?.id ? maskId(idRaw) : idRaw;
      return {
        icon: '📱',
        title: 'Pago Móvil',
        rows: [
          { id: 'pm-phone', label: 'Teléfono', value: phone },
          { id: 'pm-bank', label: 'Banco', value: bank },
          { id: 'pm-id', label: 'Cédula/RIF', value: id },
          amountRow,
        ],
      };
    }

    if (method === 'BINANCE') {
      const id = cfg?.binance?.id || 'binance@ejemplo.com';
      return {
        icon: '⚡',
        title: 'Binance Pay',
        rows: [
          { id: 'bn-id', label: 'ID / Email', value: id },
          { id: 'bn-note', label: 'Referencia', value: 'Indica tu nombre en el memo' },
          amountRow,
        ],
      };
    }

    if (method === 'CASH_USD') {
      return {
        icon: '💵',
        title: 'Efectivo USD',
        rows: [
          { id: 'cash-info', label: 'Entrega', value: 'Coordinarás el punto de entrega por WhatsApp' },
          amountRow,
          { id: 'cash-note', label: 'Nota', value: 'Lleva billetes en buen estado' },
        ],
      };
    }

    if (method === 'TRANSFER_BS') {
      const account = cfg?.transfer?.account || '0000-0000-00-0000000000';
      const name = cfg?.transfer?.name || 'Nombre del titular';
      const idRaw = cfg?.pagoMovil?.id || 'V-00.000.000';
      const id = cfg?.pagoMovil?.id ? maskId(idRaw) : idRaw;
      return {
        icon: '🏦',
        title: 'Transferencia bancaria Bs.',
        rows: [
          { id: 'tf-account', label: 'Cuenta', value: account },
          { id: 'tf-name', label: 'Titular', value: name },
          { id: 'tf-id', label: 'Cédula/RIF', value: id },
          amountRow,
        ],
      };
    }

    if (method === 'CRYPTO') {
      return {
        icon: '🪙',
        title: 'Crypto (USDT)',
        rows: [
          { id: 'cr-network', label: 'Red', value: 'TRC20' },
          { id: 'cr-wallet', label: 'Wallet', value: 'Txxxxxxxxxxxxxxxxxxxx' },
          amountRow,
        ],
      };
    }

    return getPaymentDetails('ZELLE');
  };

  const currentPaymentDetails = getPaymentDetails(paymentMethod);

  const handleCopy = (id: string, value: string) => {
    if (!value) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    setCopiedField(id);
    setTimeout(() => {
      setCopiedField(prev => (prev === id ? null : prev));
    }, 1800);
  };

  const handleNext = () => {
    if (step < 5) {
      setError(null);
      setStep(step + 1);
      return;
    }
    submitOrder();
  };

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
              Paso {step} de 5
            </p>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr,0.7fr]">
          <section className="space-y-6">
            <div className="rounded-[24px] bg-white p-6 shadow-xl ring-1 ring-black/5">
              <div className="mb-6 flex items-center justify-center gap-0">
                {steps.map((s, index) => {
                  const isDone = s.id < step;
                  const isActive = s.id === step;
                  const isLast = index === steps.length - 1;
                  return (
                    <div key={s.id} className="flex items-center gap-0">
                      <div className="relative">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                            isActive
                              ? 'border-[var(--accent)] bg-[var(--accent)] text-black shadow-[0_0_0_4px_rgba(245,200,66,0.15)]'
                              : isDone
                                ? 'border-emerald-400 bg-emerald-500/10 text-emerald-400'
                                : 'border-black/10 bg-[var(--bg-light)] text-zinc-400'
                          }`}
                        >
                          {s.id}
                        </div>
                        <div
                          className={`absolute left-1/2 top-10 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold tracking-wide ${
                            isActive ? 'text-[var(--accent)]' : isDone ? 'text-emerald-500' : 'text-zinc-400'
                          }`}
                        >
                          {s.label}
                        </div>
                      </div>
                      {!isLast && (
                        <div
                          className={`mx-1 h-[2px] w-10 ${
                            isDone ? 'bg-gradient-to-r from-emerald-400 to-emerald-300' : 'bg-black/10'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {step === 1 && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-black/5 bg-[var(--bg-light)] p-5 text-center">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-2">
                      Resumen del pedido
                    </div>
                    <div className="font-heading text-3xl font-extrabold text-[var(--dark)]">
                      ${(totalCents / 100).toFixed(2)}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      <DualPrice usdCents={totalCents} showBoth />
                    </div>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {items.map(item => (
                        <span
                          key={item.productId}
                          className="rounded-full border border-black/5 bg-white px-3 py-1 text-[11px] font-semibold text-zinc-500"
                        >
                          {item.quantity}× {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    En los siguientes pasos completarás tus datos, elegirás cómo pagar y podrás registrar el comprobante
                    para que el negocio confirme tu pedido.
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-bold">
                    <span className="text-lg">👤</span>
                    <span>Tus datos de entrega</span>
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={event => setName(event.target.value)}
                        className="w-full rounded-xl border-2 border-black/5 bg-[var(--bg-light)] px-4 py-3 text-sm font-medium outline-none transition-all focus:border-[var(--accent)]"
                        placeholder="Ej: Juan Pérez"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={event => setPhone(event.target.value)}
                        className="w-full rounded-xl border-2 border-black/5 bg-[var(--bg-light)] px-4 py-3 text-sm font-medium outline-none transition-all focus:border-[var(--accent)]"
                        placeholder="Ej: 0412 1234567"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Email (opcional)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        className="w-full rounded-xl border-2 border-black/5 bg-[var(--bg-light)] px-4 py-3 text-sm font-medium outline-none transition-all focus:border-[var(--accent)]"
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Cédula / RIF (opcional)
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={docType}
                          onChange={e => setDocType(e.target.value)}
                          className="w-28 rounded-xl border-2 border-black/5 bg-[var(--bg-light)] px-3 py-3 text-sm font-medium outline-none transition-all focus:border-[var(--accent)]"
                          style={{ appearance: 'none' }}
                        >
                          {documentTypes.map(dt => (
                            <option key={dt.id} value={dt.codigo}>{dt.codigo}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={docNumber}
                          onChange={e => setDocNumber(e.target.value)}
                          className="flex-1 rounded-xl border-2 border-black/5 bg-[var(--bg-light)] px-4 py-3 text-sm font-medium outline-none transition-all focus:border-[var(--accent)]"
                          placeholder="00.000.000"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400">Ejemplo: V-12.345.678</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Dirección de entrega
                    </label>
                    <textarea
                      value={address}
                      onChange={event => setAddress(event.target.value)}
                      className="min-h-[80px] w-full resize-none rounded-xl border-2 border-black/5 bg-[var(--bg-light)] px-4 py-3 text-sm font-medium outline-none transition-all focus:border-[var(--accent)]"
                      placeholder="Calle, edificio, apto..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Indicaciones para el envío (opcional)
                    </label>
                    <textarea
                      value={addressNotes}
                      onChange={event => setAddressNotes(event.target.value)}
                      className="min-h-[60px] w-full resize-none rounded-xl border-2 border-black/5 bg-[var(--bg-light)] px-4 py-3 text-sm font-medium outline-none transition-all focus:border-[var(--accent)]"
                      placeholder="Ej: Tocar timbre 3B, dejar en recepción..."
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-bold">
                    <span className="text-lg">💳</span>
                    <span>Elige cómo vas a pagar</span>
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {(availablePaymentMethods.length > 0
                      ? availablePaymentMethods.map(method => ({ value: method.code, label: method.name }))
                      : FALLBACK_PAYMENT_METHODS
                    ).map(method => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method.value);
                          setPreferredPayment(method.value);
                          setError(null);
                        }}
                        className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left text-xs font-semibold transition-all ${
                          paymentMethod === method.value
                            ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]'
                            : 'border-black/5 bg-white text-zinc-500 hover:border-zinc-300'
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                            paymentMethod === method.value ? 'border-[var(--accent)]' : 'border-zinc-300'
                          }`}
                        >
                          {paymentMethod === method.value && (
                            <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                          )}
                        </div>
                        <span>{method.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-black/5 bg-[var(--bg-light)]">
                    <div className="flex items-center gap-2 border-b border-black/5 px-4 py-3 text-sm font-semibold text-[var(--accent)]">
                      <span>{currentPaymentDetails.icon}</span>
                      <span>{currentPaymentDetails.title}</span>
                    </div>
                    <div className="space-y-2 px-4 py-3">
                      {currentPaymentDetails.rows.map(row => (
                        <div key={row.id} className="flex items-center gap-2 text-xs">
                          <div className="w-28 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                            {row.label}
                          </div>
                          <div className="flex-1 font-semibold text-[var(--dark)]">{row.value}</div>
                          <button
                            type="button"
                            onClick={() => handleCopy(row.id, row.value)}
                            className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-all ${
                              copiedField === row.id
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                                : 'border-black/10 bg-white text-zinc-500 hover:border-[var(--accent)] hover:text-[var(--accent)]'
                            }`}
                          >
                            {copiedField === row.id ? '✓ Copiado' : 'Copiar'}
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="px-4 pb-4 text-[11px] text-zinc-500">
                      Después de pagar, podrás subir el comprobante y el negocio lo verificará antes de preparar tu
                      pedido.
                    </p>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-bold">
                    <span className="text-lg">📸</span>
                    <span>Subir comprobante de pago</span>
                  </h2>
                  <label
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center text-sm transition-all ${
                      proofName
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-black/10 bg-[var(--bg-light)] hover:border-[var(--accent)] hover:bg-[var(--bg-light)]/70'
                    }`}
                  >
                    {!proofName && (
                      <div className="space-y-2">
                        <div className="text-4xl">⬆️</div>
                        <div className="text-sm font-semibold text-[var(--dark)]">
                          Toca para seleccionar una captura o foto
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Formatos recomendados: JPG, PNG. Tamaño máx. 5MB.
                        </div>
                      </div>
                    )}
                    {proofName && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-4xl">🧾</div>
                        <div className="text-sm font-semibold text-emerald-600">Comprobante cargado</div>
                        <div className="text-[11px] text-zinc-500">
                          {proofName} · {proofSize}
                        </div>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={event => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          setProofName('');
                          setProofSize('');
                          return;
                        }
                        setProofName(file.name);
                        const sizeKb = file.size / 1024;
                        setProofSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb.toFixed(0)} KB`);
                      }}
                    />
                  </label>
                  <div className="space-y-2 text-[11px] text-zinc-500">
                    <p>
                      Este paso es una ayuda visual para que recuerdes enviar el comprobante al negocio. El pago se
                      confirma cuando el comercio verifica los datos.
                    </p>
                    <p>
                      También podrás enviar la captura directamente por WhatsApp cuando el negocio se comunique contigo.
                    </p>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-bold">
                    <span className="text-lg">✅</span>
                    <span>Revisar y confirmar pedido</span>
                  </h2>
                  <div className="space-y-3 text-sm">
                    <button
                      type="button"
                      onClick={() => setCheckReviewedOrder(v => !v)}
                      className="flex w-full items-start gap-3 rounded-xl border border-black/5 bg-[var(--bg-light)] px-4 py-3 text-left text-[13px] transition-colors hover:border-[var(--accent)]"
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border-2 text-[11px] font-bold ${
                          checkReviewedOrder
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-zinc-300 bg-white text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                      <span>
                        He revisado los productos y el monto total de{' '}
                        <span className="font-semibold">
                          ${(totalCents / 100).toFixed(2)}
                        </span>
                        .
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckSentReceipt(v => !v)}
                      className="flex w-full items-start gap-3 rounded-xl border border-black/5 bg-[var(--bg-light)] px-4 py-3 text-left text-[13px] transition-colors hover:border-[var(--accent)]"
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border-2 text-[11px] font-bold ${
                          checkSentReceipt
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-zinc-300 bg-white text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                      <span>Estoy listo para enviar el comprobante cuando el negocio lo solicite.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckOnWhatsapp(v => !v)}
                      className="flex w-full items-start gap-3 rounded-xl border border-black/5 bg-[var(--bg-light)] px-4 py-3 text-left text-[13px] transition-colors hover:border-[var(--accent)]"
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border-2 text-[11px] font-bold ${
                          checkOnWhatsapp
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-zinc-300 bg-white text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                      <span>Quiero recibir la confirmación y el seguimiento de mi pedido por WhatsApp.</span>
                    </button>
                  </div>
                  <div className="space-y-2 text-[11px] text-zinc-500">
                    <p>
                      Al confirmar, se enviará tu pedido al comercio. Luego te escribirán por WhatsApp para coordinar el
                      pago y el envío.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-600">
                  ⚠️ {error}
                </div>
              )}

              <div className="mt-6 flex items-center gap-3 pt-3">
                <button
                  type="button"
                  disabled={step === 1 || submitting}
                  onClick={() => {
                    if (step > 1) {
                      setError(null);
                      setStep(step - 1);
                    }
                  }}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                    step === 1 || submitting
                      ? 'cursor-not-allowed border-black/5 bg-zinc-100 text-zinc-300'
                      : 'border-black/10 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-800'
                  }`}
                >
                  Atrás
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleNext}
                  className="flex flex-1 items-center justify-center rounded-2xl bg-[var(--dark)] py-3 text-center font-heading text-sm font-bold text-white shadow-xl shadow-zinc-950/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting
                    ? 'Procesando...'
                    : step < 5
                      ? 'Siguiente'
                      : 'Confirmar pedido · ' + (totalCents / 100).toFixed(2) + '$'}
                </button>
              </div>
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
