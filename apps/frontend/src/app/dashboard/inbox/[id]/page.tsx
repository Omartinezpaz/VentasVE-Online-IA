// apps/frontend/src/app/dashboard/inbox/[id]/page.tsx
'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChatSidebar } from '@/components/chatbot/ChatSidebar';
import { ChatMessage } from '@/components/chatbot/ChatMessage';
import { BotStatusBadge } from '@/components/chatbot/BotStatusBadge';
import { chatApi, Conversation, Message as ApiMessage } from '@/lib/api/chat';
import { getAccessToken } from '@/lib/auth/storage';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  source: 'wa' | 'ig' | 'web';
  botStatus: 'auto' | 'human' | 'done';
}

interface Message {
  id: string;
  sender: 'client' | 'bot' | 'human';
  text: string;
  time: string;
  status?: 'sent' | 'delivered';
  attachments?: Array<{ type: 'image' | 'file'; name: string; size: string }>;
  orderPreview?: { items: Array<{ name: string; qty: number; price: number }>; total: number };
  paymentPreview?: { method: string; ref: string; amount: string };
}

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
  message: ApiMessage;
};

type ConversationUpdatedEvent = {
  id: string;
  status: string;
  botActive?: boolean;
  updatedAt: string;
};

type MessageDeliveredEvent = {
  messageId: string;
};

export default function ChatInboxPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const chatId = params.id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [botActive, setBotActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const mapApiMessageToLocal = useCallback((msg: ApiMessage): Message => {
    const sender: Message['sender'] =
      msg.role === 'CUSTOMER' ? 'client' : msg.role === 'BOT' ? 'bot' : 'human';

    return {
      id: msg.id,
      sender,
      text: msg.content,
      time: new Date(msg.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'sent'
    };
  }, []);

  const loadMessages = useCallback(
    async (conversationId: string, baseConversations?: Conversation[]) => {
      try {
        const response = await chatApi.getMessages(conversationId, { page: 1, limit: 200 });
        const apiMessages = response.data.data;
        setMessages(apiMessages.map(mapApiMessageToLocal));

        const list = baseConversations ?? conversations;
        const conv = list.find(c => c.id === conversationId);
        if (conv) {
          setBotActive(conv.botActive ?? conv.status === 'BOT');
        }
      } catch {
        setError('No se pudieron cargar los mensajes');
      }
    },
    [conversations, mapApiMessageToLocal]
  );

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

        const initialId = chatId || data[0]?.id || null;
        if (initialId) {
          setActiveChat(initialId);
          await loadMessages(initialId, data);
        }
      } catch {
        setError('No se pudieron cargar las conversaciones');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, chatId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !activeChat) return;

    const content = inputValue;
    setInputValue('');

    try {
      await chatApi.sendMessage(activeChat, content);
    } catch {
      setError('No se pudo enviar el mensaje');
    }
  }, [activeChat, inputValue]);

  const handleQuickReply = useCallback((text: string) => {
    setInputValue(text);
  }, []);

  const toggleBot = useCallback(async () => {
    if (!activeChat) return;
    try {
      const response = await chatApi.toggleBot(activeChat);
      const updated = response.data;
      setBotActive(updated.botActive ?? updated.status === 'BOT');
      setConversations(prev =>
        prev.map(conversation =>
          conversation.id === updated.id ? { ...conversation, ...updated } : conversation
        )
      );
    } catch {
      setError('No se pudo actualizar el modo del bot');
    }
  }, [activeChat]);

  const handleChatSelect = useCallback(
    (nextId: string) => {
      setActiveChat(nextId);
      router.push(`/dashboard/inbox/${nextId}`);
      loadMessages(nextId);
    },
    [router, loadMessages]
  );

  const chats: Chat[] = useMemo(
    () =>
      conversations.map(conversation => {
        const customerName =
          conversation.customer?.name ||
          conversation.customer?.phone ||
          'Cliente WhatsApp';
        const lastMessage = conversation.messages?.[0];
        const totalMessages = conversation._count?.messages ?? 0;
        const previewCount = conversation.messages?.length ?? 0;
        const unread = Math.max(totalMessages - previewCount, 0);
        const source: Chat['source'] =
          conversation.channel === 'INSTAGRAM'
            ? 'ig'
            : conversation.channel === 'WEB'
              ? 'web'
              : 'wa';
        const botStatus: Chat['botStatus'] =
          conversation.status === 'BOT'
            ? 'auto'
            : conversation.status === 'HUMAN'
              ? 'human'
              : 'done';

        return {
          id: conversation.id,
          name: customerName,
          avatar: customerName.charAt(0),
          lastMessage: lastMessage?.content ?? '',
          time: new Date(conversation.updatedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          unread,
          source,
          botStatus
        };
      }),
    [conversations]
  );

  const currentChat = chats.find(c => c.id === activeChat) || chats[0];

  useWebSocket<NewMessageEvent>('new_message', payload => {
    setConversations(prev => {
      const existingIndex = prev.findIndex(
        conversation => conversation.id === payload.conversation.id
      );

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
          messages:
            (existingIndex >= 0 ? prev[existingIndex]._count?.messages ?? 0 : 0) + 1
        }
      };

      if (existingIndex >= 0) {
        const next = [...prev];
        next.splice(existingIndex, 1);
        return [updatedConversation, ...next];
      }

      return [updatedConversation, ...prev];
    });

    if (payload.conversation.id === activeChat) {
      setMessages(prev => [...prev, mapApiMessageToLocal(payload.message)]);
    }
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

    if (payload.id === activeChat) {
      setBotActive(payload.botActive ?? payload.status === 'BOT');
    }
  });

  useWebSocket<MessageDeliveredEvent>('message_delivered', payload => {
    setMessages(prev =>
      prev.map(message =>
        message.id === payload.messageId ? { ...message, status: 'delivered' } : message
      )
    );
  });

  return (
    <div className="h-screen flex bg-[var(--bg)] text-[var(--text)] font-body">
      {/* Sidebar */}
      <ChatSidebar
        chats={chats}
        activeChat={activeChat}
        onSelect={handleChatSelect}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="chat-topbar px-5 py-4 border-b border-[var(--border)] bg-[var(--bg2)] flex items-center gap-4 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--surface2)] flex items-center justify-center text-lg border border-[var(--border)]">
            {currentChat?.avatar}
          </div>
          <div>
            <div className="font-bold text-sm">{currentChat?.name}</div>
            <div className="text-xs text-[var(--green)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-blink" />
              {currentChat?.source === 'ig'
                ? 'En línea · Instagram'
                : currentChat?.source === 'web'
                  ? 'En línea · Web'
                  : 'En línea · WhatsApp'}
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-sm hover:border-[var(--accent)] transition">📋</button>
            <button className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-sm hover:border-[var(--accent)] transition">👤</button>
            <button className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-sm hover:border-[var(--accent)] transition">📦</button>
          </div>
        </div>

        {/* Bot Status Bar */}
        <BotStatusBadge 
          active={botActive} 
          onToggle={toggleBot}
          botName="Valeria"
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-1">
          {loading && (
            <div className="py-4 text-xs text-[var(--muted)]">
              Cargando conversación...
            </div>
          )}
          {error && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id}>
              <ChatMessage
                message={msg}
                isBot={msg.sender === 'bot'}
                isHuman={msg.sender === 'human'}
                onQuickReply={handleQuickReply}
              />
              {msg.sender !== 'client' && (
                <div className="mt-0.5 pr-2 text-right text-[10px] text-[var(--muted)]">
                  {msg.status === 'delivered' ? '✓✓ Entregado' : '✓ Enviado'}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {messages[messages.length - 2]?.quickReplies && (
          <div className="px-5 pb-2 flex gap-2 flex-wrap">
            {messages[messages.length - 2].quickReplies?.map((reply, i) => (
              <button
                key={i}
                onClick={() => handleQuickReply(reply)}
                className="px-4 py-1.5 bg-[var(--surface2)] border border-[var(--purple)]/30 rounded-full text-sm font-medium text-[var(--purple)] hover:bg-[var(--purple)]/12 hover:border-[var(--purple)] transition"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="chat-input-area px-5 py-4 border-t border-[var(--border)] bg-[var(--bg2)] flex-shrink-0">
          {/* Quick Actions */}
          <div className="flex gap-2 mb-2 flex-wrap">
            {['✅ Pago confirmado', '🚴 En camino', '📦 Pedido listo', '🏠 Entregado'].map((reply, i) => (
              <button
                key={i}
                onClick={() => setInputValue(reply)}
                className="px-3 py-1 bg-[var(--surface2)] border border-[var(--border2)] rounded-lg text-xs text-[var(--text2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
              >
                {reply}
              </button>
            ))}
          </div>
          
          {/* Input Row */}
          <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border2)] rounded-xl px-4 py-2 focus-within:border-[var(--purple)]/50 transition">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={botActive ? "Escribe un mensaje..." : "Escribe (modo manual)..."}
              className="flex-1 bg-transparent border-none outline-none text-sm resize-none max-h-24 font-body"
              rows={1}
            />
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-[var(--text2)] hover:text-[var(--text)] transition">😊</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-[var(--text2)] hover:text-[var(--text)] transition">📎</button>
              <button 
                onClick={handleSendMessage}
                className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center text-sm text-white hover:scale-105 transition shadow-lg shadow-[var(--accent)]/30"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
