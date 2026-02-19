'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { chatApi, Conversation, Message } from '@/lib/api/chat';
import { getAccessToken } from '@/lib/auth/storage';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

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

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const conversationId = useMemo(() => params.id, [params.id]);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyMessage, setReplyMessage] = useState<string | null>(null);
  const [botToggling, setBotToggling] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    const load = async () => {
      try {
        const [conversationsResponse, messagesResponse] = await Promise.all([
          chatApi.list({ page: 1, limit: 100 }),
          chatApi.getMessages(conversationId, { page: 1, limit: 100 })
        ]);

        const found = conversationsResponse.data.data.find(item => item.id === conversationId);

        if (!found) {
          setError('Conversación no encontrada');
          return;
        }

        if (found.channel !== 'WHATSAPP') {
          setError('Esta conversación no es de WhatsApp');
          return;
        }

        setConversation(found);
        setMessages(messagesResponse.data.data);
      } catch {
        setError('No se pudo cargar la conversación');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, conversationId]);

  useWebSocket<NewMessageEvent>('new_message', payload => {
    if (payload.conversation.id !== conversationId) {
      return;
    }

    setConversation(prev => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        status: payload.conversation.status,
        botActive: payload.conversation.botActive ?? prev.botActive,
        updatedAt: payload.message.createdAt,
        customer: payload.customer
          ? {
              id: payload.customer.id,
              name: payload.customer.name,
              phone: payload.customer.phone
            }
          : prev.customer,
        messages: [
          {
            id: payload.message.id,
            role: payload.message.role,
            content: payload.message.content,
            createdAt: payload.message.createdAt
          }
        ]
      };
    });

    setMessages(prev => {
      const exists = prev.some(message => message.id === payload.message.id);
      if (exists) {
        return prev;
      }
      return [
        ...prev,
        {
          id: payload.message.id,
          role: payload.message.role,
          content: payload.message.content,
          createdAt: payload.message.createdAt
        }
      ];
    });
  });

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!conversation) return;
    const content = replyContent.trim();
    if (!content) return;

    setReplySending(true);
    setReplyMessage(null);

    try {
      const response = await chatApi.sendMessage(conversation.id, content);
      const message = response.data;

      setMessages(prev => {
        const exists = prev.some(item => item.id === message.id);
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });

      setConversation(prev => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          updatedAt: message.createdAt,
          messages: [message]
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

  const handleToggleBot = async () => {
    if (!conversation) return;

    setBotToggling(true);

    try {
      const response = await chatApi.toggleBot(conversation.id);
      const updated = response.data;
      setConversation(prev =>
        prev
          ? {
              ...prev,
              status: updated.status,
              botActive: updated.botActive,
              updatedAt: updated.updatedAt
            }
          : prev
      );
    } catch {
      setReplyMessage('No se pudo cambiar el modo del bot');
    } finally {
      setBotToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 text-sm text-zinc-400">
        Cargando conversación...
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
        {error || 'Conversación no encontrada'}
      </div>
    );
  }

  const customerName = conversation.customer?.name || 'Cliente WhatsApp';
  const customerPhone = conversation.customer?.phone || 'Sin teléfono';
  const botActive = conversation.botActive ?? false;

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col rounded-lg border border-zinc-800 bg-zinc-900/80">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <div className="text-xs font-semibold text-zinc-50">
            {customerName}
          </div>
          <div className="text-[11px] text-zinc-500">
            {customerPhone}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            Última actividad: {formatDateTime(conversation.updatedAt)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-200">
            {botActive ? 'Bot' : 'Humano'}
          </span>
          <button
            type="button"
            onClick={handleToggleBot}
            disabled={botToggling}
            className="rounded bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-100 disabled:opacity-70"
          >
            {botActive ? 'Pasar a humano' : 'Pasar a bot'}
          </button>
        </div>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-xs">
        {messages.map(message => {
          const isCustomer = message.role === 'CUSTOMER';
          const isAgent = message.role === 'AGENT';
          const isBot = message.role === 'BOT';

          const label = isCustomer ? 'Cliente' : isAgent ? 'Tú' : 'Bot';

          return (
            <div
              key={message.id}
              className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs rounded-lg px-3 py-2 ${
                  isCustomer
                    ? 'bg-zinc-800 text-zinc-50'
                    : isBot
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'bg-blue-500 text-zinc-50'
                }`}
              >
                <div className="mb-1 text-[10px] opacity-80">
                  {label}
                </div>
                <div>
                  {message.content}
                </div>
                <div className="mt-1 text-[9px] opacity-70">
                  {formatDateTime(message.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        {!messages.length && (
          <div className="py-4 text-center text-[11px] text-zinc-500">
            Aún no hay mensajes en esta conversación.
          </div>
        )}
      </div>
      <form onSubmit={handleSend} className="border-t border-zinc-800 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={replyContent}
            onChange={event => setReplyContent(event.target.value)}
            rows={2}
            className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100"
            placeholder="Escribe un mensaje para este cliente..."
          />
          <button
            type="submit"
            disabled={replySending || !replyContent.trim()}
            className="rounded bg-emerald-500 px-3 py-1.5 text-xs font-medium text-zinc-950 disabled:opacity-70"
          >
            {replySending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
        {replyMessage && (
          <div className="mt-1 text-[11px] text-zinc-400">
            {replyMessage}
          </div>
        )}
      </form>
    </div>
  );
}

