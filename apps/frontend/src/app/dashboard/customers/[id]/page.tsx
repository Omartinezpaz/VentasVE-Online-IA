'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { customersApi, Customer } from '@/lib/api/customers';
import { getAccessToken } from '@/lib/auth/storage';
import { chatApi } from '@/lib/api/chat';
import { catalogApi, DocumentType } from '@/lib/api/catalog';
import { parseIdentification, composeIdentification } from '@/lib/identification';

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

const formatCurrency = (cents: number) => {
  return (cents / 100).toFixed(2);
};

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [identification, setIdentification] = useState('');
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [docType, setDocType] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyMessage, setReplyMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    const load = async () => {
      try {
        const [customerRes, docTypesRes] = await Promise.all([
          customersApi.getById(id),
          catalogApi.getDocumentTypes(),
        ]);

        const data = customerRes.data;
        setCustomer(data);
        setName(data.name ?? '');
        setPhone(data.phone ?? '');
        setEmail(data.email ?? '');
        setAddress(data.address ?? '');
        setAddressNotes(data.addressNotes ?? '');
        setIdentification(data.identification ?? '');

        const docs = docTypesRes.data;
        setDocumentTypes(docs);
        if (docs.length > 0) {
          const firstType = docs[0].codigo;
          const parsed = parseIdentification(data.identification ?? '', firstType);
          setDocType(parsed.type);
          setDocNumber(parsed.number);
        }
      } catch {
        setError('No se pudo cargar el cliente');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, id]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customer) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const composedId = composeIdentification(docType, docNumber) ?? (identification || null);

      const response = await customersApi.update(customer.id, {
        name: name || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        addressNotes: addressNotes || null,
        identification: composedId
      });
      setCustomer(response.data);
      setSaveMessage('Perfil actualizado');
    } catch {
      setSaveMessage('No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 text-sm text-[var(--muted)]">
        Cargando cliente...
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
        {error || 'Cliente no encontrado'}
      </div>
    );
  }

  const lastConversations = customer.conversations ?? [];
  const primaryConversation = lastConversations[0];

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customer || !primaryConversation) return;
    if (!replyContent.trim()) return;

    setReplySending(true);
    setReplyMessage(null);

    try {
      const response = await chatApi.sendMessage(primaryConversation.id, replyContent.trim());
      const message = response.data;

      setCustomer(prev => {
        if (!prev) return prev;
        const conversations = prev.conversations ?? [];
        const updatedConversations = conversations.map(conversation => {
          if (conversation.id !== primaryConversation.id) {
            return conversation;
          }
          return {
            ...conversation,
            updatedAt: message.createdAt,
            messages: [message]
          };
        });
        return {
          ...prev,
          conversations: updatedConversations
        };
      });

      setReplyContent('');
      setReplyMessage('Mensaje enviado por WhatsApp');
    } catch {
      setReplyMessage('No se pudo enviar el mensaje');
    } finally {
      setReplySending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">
            {customer.name || 'Cliente sin nombre'}
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Perfil del cliente y actividad reciente
          </p>
        </div>
        <div className="text-xs text-[var(--muted)]">
          Creado el {formatDateTime(customer.createdAt)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,3fr]">
        <section className="space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Perfil
            </h2>
            <form className="mt-3 space-y-3" onSubmit={handleSave}>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Nombre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Dirección
                </label>
                <textarea
                  value={address}
                  onChange={event => setAddress(event.target.value)}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)]"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Referencias de entrega
                </label>
                <textarea
                  value={addressNotes}
                  onChange={event => setAddressNotes(event.target.value)}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)]"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Cédula / RIF
                </label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={docType}
                    onChange={event => setDocType(event.target.value)}
                    className="w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                  >
                    {documentTypes.map(dt => (
                      <option key={dt.id} value={dt.codigo}>
                        {dt.codigo}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={event => setDocNumber(event.target.value)}
                    className="flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)]"
                  />
                </div>
              </div>
              {saveMessage && (
                <p className="text-xs text-[var(--muted)]">
                  {saveMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-full rounded bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-950 disabled:opacity-70"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Últimos mensajes
            </h2>
            <div className="mt-3 space-y-2 text-xs text-[var(--foreground)]">
              {!lastConversations.length && (
                <p className="text-[var(--muted)]">
                  Aún no hay mensajes registrados para este cliente.
                </p>
              )}
              {lastConversations.map(conversation => {
                const lastMessage = conversation.messages[0];
                if (!lastMessage) {
                  return null;
                }
                const roleLabel =
                  lastMessage.role === 'CUSTOMER'
                    ? 'Cliente'
                    : lastMessage.role === 'AGENT'
                      ? 'Agente'
                      : 'Bot';
                return (
                  <div
                    key={conversation.id}
                    className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        WhatsApp
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">
                        {formatDateTime(lastMessage.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--muted)]">
                      {roleLabel}
                    </div>
                    <div className="mt-1 text-xs text-[var(--foreground)]">
                      {lastMessage.content}
                    </div>
                  </div>
                );
              })}
            </div>
            {primaryConversation && (
              <form
                onSubmit={handleReply}
                className="mt-4 space-y-2 rounded border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <label className="block text-[11px] text-[var(--muted)]">
                  Responder por WhatsApp
                </label>
                <textarea
                  value={replyContent}
                  onChange={event => setReplyContent(event.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)]"
                  placeholder="Escribe un mensaje para este cliente..."
                />
                {replyMessage && (
                  <p className="text-[11px] text-[var(--muted)]">
                    {replyMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={replySending || !replyContent.trim()}
                  className="w-full rounded bg-emerald-500 px-3 py-1.5 text-xs font-medium text-zinc-950 disabled:opacity-70"
                >
                  {replySending ? 'Enviando...' : 'Enviar mensaje'}
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Órdenes
          </h2>
          <div className="mt-3 overflow-hidden rounded border border-[var(--border)]">
            {!customer.orders?.length && (
              <div className="px-3 py-2 text-xs text-[var(--muted)]">
                Este cliente aún no tiene órdenes.
              </div>
            )}
            {customer.orders && customer.orders.length > 0 && (
              <table className="min-w-full divide-y divide-[var(--border)] text-xs">
                <thead className="bg-[var(--background)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">
                      Fecha
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">
                      Monto
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">
                      Productos
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {customer.orders.map(order => {
                    const products = order.items;
                    return (
                      <tr key={order.createdAt}>
                        <td className="px-3 py-2 text-[var(--foreground)]">
                          {formatDateTime(order.createdAt)}
                        </td>
                        <td className="px-3 py-2 text-[var(--foreground)]">
                          ${formatCurrency(order.totalCents)}
                        </td>
                        <td className="px-3 py-2 text-[var(--foreground)]">
                          {products && products.length > 0
                            ? products
                                .map(item => `${item.quantity} x ${item.product.name}`)
                                .join(', ')
                            : 'Sin detalle'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
