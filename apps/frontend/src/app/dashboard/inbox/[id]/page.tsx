// apps/frontend/src/app/dashboard/inbox/[id]/page.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChatSidebar } from '@/components/chatbot/ChatSidebar';
import { ChatMessage } from '@/components/chatbot/ChatMessage';
import { BotStatusBadge } from '@/components/chatbot/BotStatusBadge';
import { Button } from '@/components/ui/Button';

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
  attachments?: Array<{ type: 'image' | 'file'; name: string; size: string }>;
  orderPreview?: { items: Array<{ name: string; qty: number; price: number }>; total: number };
  paymentPreview?: { method: string; ref: string; amount: string };
}

// Datos de ejemplo
const CHATS: Chat[] = [
  { id: 'c1', name: 'María Alejandra', avatar: '👩', lastMessage: '¿Tienen el polo en azul talla M?', time: '10:42', unread: 2, source: 'wa', botStatus: 'auto' },
  { id: 'c2', name: 'Carlos Instagram', avatar: '👨', lastMessage: 'Quiero hacer un pedido grande', time: '10:28', unread: 1, source: 'ig', botStatus: 'human' },
  { id: 'c3', name: 'Luisa Fernández', avatar: '👩‍💼', lastMessage: 'Ya hice el pago móvil 🙏', time: '10:18', unread: 4, source: 'wa', botStatus: 'auto' },
];

const MESSAGES: Message[] = [
  { id: 'm1', sender: 'client', text: 'Hola buenas! Quería preguntar si tienen el polo classic en azul talla M disponible?', time: '10:38' },
  { id: 'm2', sender: 'bot', text: '¡Hola María! Soy Valeria de Mis Modas 2025 👋\n\n¡Claro que sí! Tenemos el Polo Classic Premium disponible en azul talla M. Precio: $12.00 (Bs. 438,000)\n\n¿Cuántas unidades te interesan?', time: '10:38' },
  { id: 'm3', sender: 'client', text: 'Me interesan 2 unidades y también vi un bolso rosa en el catálogo', time: '10:40' },
  { id: 'm4', sender: 'bot', text: '¡Perfecto! Déjame confirmarte:\n\n✅ 2x Polo Classic Premium Azul M = $24.00\n✅ 1x Bolso Elegante Rosa disponible = $22.00\n\n🛒 Total: $46.00 (Bs. 1,679,000)', time: '10:40', orderPreview: { items: [{ name: 'Polo Classic x2', qty: 2, price: 24 }, { name: 'Bolso Elegante x1', qty: 1, price: 22 }], total: 46 } },
  { id: 'm5', sender: 'bot', text: '¿Confirmas este pedido? ¿Cómo prefieres pagar? 💳', time: '10:40', quickReplies: ['💸 Zelle', '📱 Pago Móvil', '⚡ Binance', '💵 Efectivo'] },
  { id: 'm6', sender: 'client', text: 'Voy a pagar por Zelle 💸', time: '10:41' },
  { id: 'm7', sender: 'bot', text: '¡Excelente! Estos son los datos para el pago:', time: '10:41', paymentPreview: { method: 'Zelle', ref: 'juan@gmail.com', amount: '$46.00 USD' } },
  { id: 'm8', sender: 'bot', text: 'Una vez que hagas el pago, envíame la captura del comprobante 📸 y confirmo tu pedido en segundos ⚡', time: '10:41' },
  { id: 'm9', sender: 'client', text: 'Listo! Ya hice el pago, te mando la foto', time: '10:42' },
  { id: 'm10', sender: 'client', text: '', time: '10:42', attachments: [{ type: 'image', name: 'comprobante_zelle.jpg', size: '248 KB' }] },
  { id: 'm11', sender: 'bot', text: '', time: '10:42', isTyping: true },
];

export default function ChatInboxPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const chatId = params.id;
  
  const [chats, setChats] = useState<Chat[]>(CHATS);
  const [messages, setMessages] = useState<Message[]>(MESSAGES);
  const [activeChat, setActiveChat] = useState(chatId || CHATS[0].id);
  const [botActive, setBotActive] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim()) return;
    
    const newMessage: Message = {
      id: `m${Date.now()}`,
      sender: 'human',
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    
    // Simular respuesta del bot si está activo
    if (botActive) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `m${Date.now() + 1}`,
          sender: 'bot',
          text: `✅ "${inputValue}" registrado y confirmado. Tu pedido ha sido actualizado. 📱`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
      }, 1200);
    }
  }, [inputValue, botActive]);

  const handleQuickReply = useCallback((text: string) => {
    setInputValue(text);
  }, []);

  const toggleBot = useCallback(() => {
    setBotActive(prev => !prev);
  }, []);

  const handleChatSelect = useCallback((chatId: string) => {
    setActiveChat(chatId);
    router.push(`/dashboard/inbox/${chatId}`);
  }, [router]);

  const currentChat = chats.find(c => c.id === activeChat);

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
              En línea · WhatsApp
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
          {messages.map((msg, i) => (
            <ChatMessage 
              key={msg.id} 
              message={msg}
              isBot={msg.sender === 'bot'}
              isHuman={msg.sender === 'human'}
              onQuickReply={handleQuickReply}
            />
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