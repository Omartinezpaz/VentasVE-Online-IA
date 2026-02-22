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
  const [filter, setFilter] = useState<'all' | 'unread' | 'bot' | 'human'>('all');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    const load = async () => {
      try {
        const response = await chatApi.list({ page: 1, limit: 50 });
        const data = response.data.data;
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
      <div className="py-6 text-sm text-[var(--muted)]">
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

  const filteredConversations = conversations.filter(c => {
    if (filter === 'unread') return (c._count?.messages ?? 0) > (c.messages?.length ?? 0);
    if (filter === 'bot') return c.status === 'BOT';
    if (filter === 'human') return c.status === 'HUMAN';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-[var(--foreground)]">Inbox Unificado</h1>
          <p className="text-xs text-[var(--muted)]">Gestiona tus conversaciones de WhatsApp, Instagram y Web.</p>
        </div>
        <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
           {(['all', 'unread', 'bot', 'human'] as const).map(f => (
             <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-[var(--background)] text-[var(--accent)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
             >
                {f === 'all' ? 'Todos' : f === 'unread' ? 'Sin leer' : f === 'bot' ? 'Bot activo' : 'Humano'}
             </button>
           ))}
        </div>
      </div>

      <div className="card-elevated overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="divide-y divide-[var(--border)]">
            {filteredConversations.map(conversation => {
              const lastMessage = conversation.messages?.[0];
              const hasUnread = (conversation._count?.messages ?? 0) > (conversation.messages?.length ?? 0);
              const customerName =
                conversation.customer?.name ||
                conversation.customer?.phone ||
                'Cliente';
              const channel = conversation.channel;
              const channelBg =
                channel === 'INSTAGRAM'
                  ? 'bg-gradient-to-br from-purple-600 via-red-500 to-orange-400'
                  : channel === 'WEB'
                    ? 'bg-[var(--blue)]'
                    : 'bg-[#25d366]';
              const channelLabel =
                channel === 'INSTAGRAM'
                  ? '📸 IG'
                  : channel === 'WEB'
                    ? '🌐 Web'
                    : '💬 WA';

              return (
                <div
                  key={conversation.id}
                  className="group flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-[var(--background)]/40"
                  onClick={() => router.push(`/dashboard/inbox/${conversation.id}`)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative">
                        <div className="h-12 w-12 rounded-2xl bg-[var(--surface2)] flex items-center justify-center font-heading text-lg font-bold text-[var(--muted)] group-hover:bg-[var(--background)] transition-colors">
                            {customerName.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border-2 border-[var(--surface)] px-1.5 py-0.5 text-[9px] font-bold text-white ${channelBg}`}>
                          {channelLabel}
                        </div>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--foreground)] truncate">
                            {customerName}
                        </span>
                        {hasUnread && <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] truncate mt-0.5">
                        {lastMessage ? lastMessage.content : 'Sin mensajes'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-4">
                    <span className="text-[10px] font-medium text-[var(--muted)]">
                        {formatDateTime(conversation.updatedAt).split(',')[1]}
                    </span>
                    <span className={`rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight ${conversation.status === 'BOT' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-[var(--surface2)] text-[var(--muted)]'}`}>
                      {conversation.status === 'BOT' ? '🤖 Bot' : '👤 Humano'}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredConversations.length === 0 && (
                <div className="p-20 text-center space-y-2">
                    <div className="text-4xl opacity-20">💬</div>
                    <div className="text-sm font-bold text-[var(--foreground)]">No hay conversaciones</div>
                    <p className="text-xs text-[var(--muted)]">No se encontraron chats con el filtro seleccionado.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

