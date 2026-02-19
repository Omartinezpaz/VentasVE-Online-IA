'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { chatApi, Conversation } from '@/lib/api/chat';
import { getAccessToken } from '@/lib/auth/storage';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

type NewMessageEvent = {
  conversation: {
    id: string;
    channel: string;
    status: string;
    botActive?: boolean;
    updatedAt: string;
  };
  customer?: {
    id: string;
    name: string | null;
    phone: string | null;
  };
  message: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  };
};

type ConversationUpdatedEvent = {
  id: string;
  status: string;
  botActive?: boolean;
  updatedAt: string;
};

export default function InboxPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    const load = async () => {
      try {
        const response = await chatApi.list({ page: 1, limit: 50 });
        const data = response.data.data.filter(conversation => conversation.channel === 'WHATSAPP');
        setConversations(data);
      } catch {
        setError('No se pudieron cargar las conversaciones');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  useWebSocket<NewMessageEvent>('new_message', payload => {
    if (payload.conversation.channel !== 'WHATSAPP') {
      return;
    }

    setConversations(prev => {
      const existingIndex = prev.findIndex(conversation => conversation.id === payload.conversation.id);

      const updatedConversation: Conversation = {
        id: payload.conversation.id,
        channel: payload.conversation.channel,
        status: payload.conversation.status,
        botActive: payload.conversation.botActive,
        updatedAt: payload.message.createdAt,
        customer: payload.customer
          ? {
              id: payload.customer.id,
              name: payload.customer.name,
              phone: payload.customer.phone
            }
          : undefined,
        messages: [
          {
            id: payload.message.id,
            role: payload.message.role,
            content: payload.message.content,
            createdAt: payload.message.createdAt
          }
        ],
        _count: {
          messages: (existingIndex >= 0 ? (prev[existingIndex]._count?.messages ?? 0) : 0) + 1
        }
      };

      if (existingIndex >= 0) {
        const next = [...prev];
        next.splice(existingIndex, 1);
        return [updatedConversation, ...next];
      }

      return [updatedConversation, ...prev];
    });
  });

  useWebSocket<ConversationUpdatedEvent>('conversation_updated', payload => {
    setConversations(prev =>
      prev.map(conversation =>
        conversation.id === payload.id
          ? {
              ...conversation,
              status: payload.status,
              botActive: payload.botActive ?? conversation.botActive,
              updatedAt: payload.updatedAt
            }
          : conversation
      )
    );
  });

  if (loading) {
    return (
      <div className="py-6 text-sm text-zinc-400">
        Cargando conversaciones...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-sm text-zinc-400">
        Aún no tienes conversaciones de WhatsApp. Cuando tus clientes te escriban, aparecerán aquí.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-50">
            Inbox WhatsApp
          </h2>
          <p className="text-xs text-zinc-500">
            Conversaciones recientes con tus clientes desde WhatsApp.
          </p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
        <table className="min-w-full divide-y divide-zinc-800 text-xs">
          <thead className="bg-zinc-900/80">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Cliente
              </th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Último mensaje
              </th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Estado
              </th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Actualizado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {conversations.map(conversation => {
              const lastMessage = conversation.messages?.[0];
              const hasUnread = (conversation._count?.messages ?? 0) > (conversation.messages?.length ?? 0);
              const customerName = conversation.customer?.name || 'Cliente WhatsApp';
              const customerPhone = conversation.customer?.phone || 'Sin teléfono';

              const statusLabel =
                conversation.status === 'BOT'
                  ? 'Bot'
                  : conversation.status === 'HUMAN'
                    ? 'Humano'
                    : conversation.status === 'CLOSED'
                      ? 'Cerrada'
                      : conversation.status;

              return (
                <tr
                  key={conversation.id}
                  className="cursor-pointer hover:bg-zinc-900/80"
                  onClick={() => router.push(`/dashboard/inbox/${conversation.id}`)}
                >
                  <td className="px-3 py-2 text-zinc-200">
                    <div className="flex flex-col">
                      <span className="truncate">
                        {customerName}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {customerPhone}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-zinc-200">
                    {lastMessage ? (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500">
                          {lastMessage.role === 'CUSTOMER'
                            ? 'Cliente'
                            : lastMessage.role === 'AGENT'
                              ? 'Tú'
                              : 'Bot'}
                        </span>
                        <span className="line-clamp-2">
                          {lastMessage.content}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-500">
                        Sin mensajes
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-200">
                        {statusLabel}
                      </span>
                      {hasUnread && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {formatDateTime(conversation.updatedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

