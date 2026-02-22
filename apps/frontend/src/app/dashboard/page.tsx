'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/auth/storage';

// ─── TIPOS ─────────────────────────────────────────────────────────────
type TimeRange = 'hoy' | 'semana' | 'mes';
type OrderStatus = 'NUEVO' | 'CONFIRMADO' | 'PREPARANDO' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';
type PaymentMethod = 'Zelle' | 'Pago Móvil' | 'Binance' | 'Efectivo' | 'Transferencia';

interface Order {
  id: string;
  num: string;
  customer: string;
  product: string;
  amount: string;
  method: PaymentMethod;
  status: OrderStatus;
  time: string;
}

interface Chat {
  id: string;
  name: string;
  msg: string;
  time: string;
  unread: number;
  ch: 'wa' | 'ig' | 'web';
  avatar: string;
}

interface Payment {
  id: string;
  method: string;
  client: string;
  ref: string;
  amount: string;
  ago: string;
  status: 'PENDING' | 'CONFIRMED';
  color: string;
}

// ─── DATOS DE EJEMPLO ──────────────────────────────────────────────────
const ORDERS: Order[] = [
  { id:'1', num:'#1044', customer:'María Alejandra',  product:'Polo Classic × 2',    amount:'$24.00', method:'Zelle',        status:'NUEVO',      time:'10:32' },
  { id:'2', num:'#1043', customer:'Carlos Rodríguez', product:'Tenis Sport Run × 1',  amount:'$45.00', method:'Pago Móvil',   status:'CONFIRMADO', time:'10:18' },
  { id:'3', num:'#1042', customer:'Luisa Martínez',   product:'Bolso Elegante × 1',   amount:'$22.00', method:'Binance',      status:'PREPARANDO', time:'09:54' },
  { id:'4', num:'#1041', customer:'Andrés López',     product:'Jeans Slim × 1',       amount:'$28.00', method:'Zelle',        status:'EN_CAMINO',  time:'09:20' },
  { id:'5', num:'#1040', customer:'Sofía Herrera',    product:'Vestido Floral × 1',   amount:'$35.00', method:'Efectivo',     status:'ENTREGADO',  time:'08:45' },
  { id:'6', num:'#1039', customer:'Pedro Suárez',     product:'Gorra Dad Hat × 2',    amount:'$20.00', method:'Transferencia',status:'CANCELADO',  time:'08:10' },
];

const CHATS: Chat[] = [
  { id:'c1', name:'María Alejandra',  msg:'¿Tienen el polo en talla M azul?', time:'10:32', unread:2, ch:'wa',  avatar:'👩' },
  { id:'c2', name:'Carlos Instagram', msg:'¿Hacen envíos a Maracaibo?',        time:'10:18', unread:1, ch:'ig',  avatar:'👨' },
  { id:'c3', name:'Luisa Pérez',      msg:'Ya hice el pago móvil 🙏',           time:'09:54', unread:4, ch:'wa',  avatar:'👩‍💼' },
  { id:'c4', name:'Visitante Web',    msg:'¿Tienen Zelle disponible?',          time:'09:41', unread:1, ch:'web', avatar:'👦' },
];

const PAYMENTS: Payment[] = [
  { id:'p1', method:'Zelle',      client:'María P.',   ref:'ZL-29847',      amount:'$35',      ago:'12 min', status:'PENDING',   color:'#7c3aed' },
  { id:'p2', method:'Pago Móvil', client:'Carlos R.',  ref:'0414-583-9201', amount:'Bs. 120K', ago:'8 min',  status:'PENDING',   color:'#3b82f6' },
  { id:'p3', method:'Binance',    client:'Andrés L.',  ref:'0x9f8a...c3d2', amount:'$22',      ago:'1h',     status:'CONFIRMED', color:'#22c55e' },
];

const CHART_DATA = [
  { day:'Lun', amount:820 }, { day:'Mar', amount:1100 },
  { day:'Mié', amount:640 }, { day:'Jue', amount:980  },
  { day:'Vie', amount:1380 },{ day:'Sáb', amount:1650 },
  { day:'Dom', amount:1247, today:true },
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  NUEVO:'Nuevo', CONFIRMADO:'Confirmado', PREPARANDO:'Preparando',
  EN_CAMINO:'En camino', ENTREGADO:'Entregado', CANCELADO:'Cancelado'
};

const METHOD_CLASSES: Record<PaymentMethod, string> = {
  'Zelle': 'mb-zelle', 'Pago Móvil': 'mb-pago', 'Binance': 'mb-binance',
  'Efectivo': 'mb-efectivo', 'Transferencia': 'mb-transferencia'
};

const STATUS_CLASSES: Record<OrderStatus, string> = {
  NUEVO:'sb-nuevo', CONFIRMADO:'sb-confirmado', PREPARANDO:'sb-preparando',
  EN_CAMINO:'sb-encamino', ENTREGADO:'sb-entregado', CANCELADO:'sb-cancelado'
};

// ─── COMPONENTES AUXILIARES ───────────────────────────────────────────

// Badge de método de pago
function MethodBadge({ method }: { method: PaymentMethod }) {
  return <span className={`method-badge ${METHOD_CLASSES[method] || 'mb-transferencia'}`}>{method}</span>;
}

// Badge de estado
function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <select 
      className={`status-badge ${STATUS_CLASSES[status]}`}
      style={{ background:'transparent', border:'1px solid', borderRadius:'20px', fontWeight:700, fontSize:'10px', padding:'2px 8px', cursor:'pointer', outline:'none' }}
      defaultValue={status}
    >
      {Object.entries(STATUS_LABELS).map(([v,l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

// Tarjeta KPI
function KpiCard({ label, value, subtext, delta, deltaUp, icon, color }: {
  label: string; value: string; subtext: string;
  delta?: string; deltaUp?: boolean; icon: string;
  color: 'yellow' | 'green' | 'red' | 'blue';
}) {
  const colors = {
    yellow: 'bg-[var(--accent)]', green: 'bg-[var(--green)]',
    red: 'bg-[var(--red)]', blue: 'bg-[var(--blue)]',
  };
  return (
    <div className="kpi-card relative overflow-hidden rounded-xl border bg-[var(--surface)] p-5 transition-all hover:border-[var(--accent)]/18 hover:-translate-y-0.5 animate-[fadeUp_0.45s_ease_both]">
      <div className="kpi-strip absolute top-0 left-0 right-0 h-0.5" style={{ background: colors[color] }} />
      <div className="absolute right-4 top-4 text-3xl opacity-12">{icon}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)] mb-2.5">{label}</div>
      <div className="font-[var(--font-head)] text-3xl font-extrabold mb-2">{value}</div>
      <div className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
        {delta && (
          <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded ${deltaUp ? 'delta-up' : 'delta-down'}`}>
            {delta}
          </span>
        )}
        {subtext}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('hoy');
  const [orders] = useState<Order[]>(ORDERS);
  const [payments, setPayments] = useState<Payment[]>(PAYMENTS);
  const [activeChat, setActiveChat] = useState<string>('c1');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Verificar autenticación
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace('/auth/login'); return; }
    setTimeout(() => setLoading(false), 400);
  }, [router]);

  // Copiar URL del catálogo
  const copyCatalogUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText('ventasve.app/c/mismodas2025');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  // Actualizar estado de pedido
  const confirmAllPayments = useCallback(() => {
    setPayments(prev => prev.map(p => ({ ...p, status: 'CONFIRMED' })));
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-32 rounded-xl bg-[var(--surface)] animate-pulse border border-[var(--border)]" />
        ))}
      </div>
    );
  }

  const maxChart = Math.max(...CHART_DATA.map(d => d.amount));
  const pendingCount = payments.filter(p => p.status === 'PENDING').length;

  return (
    <div className="space-y-6 pb-8">
      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[var(--bg)]/88 backdrop-blur-md border-b border-[var(--border)] -mx-6 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-[var(--font-head)] font-bold text-[17px]">Dashboard</h1>
          <div className="flex gap-0.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-0.5">
            {(['hoy', 'semana', 'mes'] as TimeRange[]).map(range => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-4 py-1.25 rounded text-[12.5px] font-medium transition-colors capitalize ${
                  timeRange === range ? 'bg-[var(--bg)] text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="w-9 h-9 rounded-lg bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center text-[15px] hover:border-[var(--accent)]/30 transition-colors">🔍</button>
          <button className="w-9 h-9 rounded-lg bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center text-[15px] hover:border-[var(--accent)]/30 transition-colors relative">
            🔔
            <span className="absolute top-1.75 right-1.75 w-1.5 h-1.5 bg-[var(--red)] rounded-full border border-[var(--surface)]" />
          </button>
          <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--red)] flex items-center justify-center font-[var(--font-head)] text-[12px] font-extrabold text-black cursor-pointer">MM</div>
        </div>
      </div>

      {/* ─── KPI ROW ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Ventas hoy" value="$1,247" subtext="vs. ayer" delta="▲ 18%" deltaUp icon="💰" color="yellow" />
        <KpiCard label="Pedidos activos" value="12" subtext="nuevos hoy" delta="▲ 3" deltaUp icon="📦" color="green" />
        <KpiCard label="Mensajes sin leer" value="8" subtext="urgentes" delta="⚠ 2" deltaUp={false} icon="💬" color="red" />
        <KpiCard label="Tasa BCV" value="Bs. 36,500" subtext="Actualizado hoy" delta="✓" deltaUp icon="🏦" color="blue" />
      </div>

      {/* ─── ROW 2: CHART + PAYMENTS ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4.5">
        {/* Chart */}
        <div className="card rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-[fadeUp_0.45s_ease_both]">
          <div className="border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
            <div>
              <div className="font-[var(--font-head)] font-bold text-[13.5px]">📈 Ventas — últimos 7 días</div>
              <div className="text-[11px] text-[var(--muted)] mt-0.5">Total semana: $7,817</div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/15">Esta semana</span>
          </div>
          <div className="p-4.5">
            <div className="flex items-end gap-2 h-35 pb-7 relative">
              {CHART_DATA.map((d, i) => {
                const pct = Math.round((d.amount / maxChart) * 100);
                const amtLabel = d.amount >= 1000 ? `$${(d.amount/1000).toFixed(1)}k` : `$${d.amount}`;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full relative group">
                    <span className="text-[9px] text-[var(--muted)] font-bold mb-1 absolute top-0">{amtLabel}</span>
                    <div className="flex-1 w-full flex items-end mt-4.5">
                      <div 
                        className={`w-full rounded-t-sm transition-all duration-800 ease-out cursor-pointer ${d.today ? 'bg-[var(--accent)] shadow-[0_0_18px_rgba(245,200,66,0.3)]' : 'bg-[var(--surface3)] hover:brightness-125'}`}
                        style={{ height: `${pct}%` }}
                      >
                        {d.today && <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_10px_rgba(245,200,66,0.6)]" />}
                      </div>
                    </div>
                    <span className={`absolute bottom-[-22px] left-1/2 -translate-x-1/2 text-[10px] font-medium ${d.today ? 'text-[var(--accent)] font-bold' : 'text-[var(--muted)]'}`}>{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Payment Distribution */}
        <div className="card rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-[fadeUp_0.45s_ease_both]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <div className="font-[var(--font-head)] font-bold text-[13.5px]">💳 Distribución de pagos</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">Ingresos del día</div>
          </div>
          <div className="p-4.5 space-y-3">
            {[
              { name: 'Zelle', icon: '💸', amt: '$620', pct: 50, color: '#7c3aed' },
              { name: 'Pago Móvil', icon: '📱', amt: '$310', pct: 25, color: 'var(--blue)' },
              { name: 'Binance', icon: '⚡', amt: '$187', pct: 15, color: '#f59e0b' },
              { name: 'Efectivo USD', icon: '💵', amt: '$81', pct: 6, color: 'var(--green)' },
              { name: 'Transferencia', icon: '🏦', amt: '$49', pct: 4, color: '#6b7280' },
            ].map((p, i) => (
              <div key={i} className="space-y-1.25">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium flex items-center gap-1.5"><span className="text-[15px]">{p.icon}</span>{p.name}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="font-[var(--font-head)] font-bold text-[13px]">{p.amt}</span>
                    <span className="text-[10px] text-[var(--muted)] w-7 text-right">{p.pct}%</span>
                  </div>
                </div>
                <div className="h-1.25 rounded bg-[var(--surface3)] overflow-hidden">
                  <div className="h-full rounded transition-all duration-1000 ease-out" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── ROW 3: ORDERS + INBOX ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4.5">
        {/* Orders Table */}
        <div className="lg:col-span-2 card rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-[fadeUp_0.45s_ease_both]">
          <div className="border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
            <div className="font-[var(--font-head)] font-bold text-[13.5px]">📋 Pedidos recientes</div>
            <button className="text-[12px] text-[var(--accent)] font-medium cursor-pointer hover:opacity-75 transition-opacity">Ver todos →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)] bg-white/2 border-b border-[var(--border)]">
                  <th className="px-3.5 py-2.5 text-left">ID</th>
                  <th className="px-3.5 py-2.5 text-left">Cliente</th>
                  <th className="px-3.5 py-2.5 text-left">Producto</th>
                  <th className="px-3.5 py-2.5 text-left">Monto</th>
                  <th className="px-3.5 py-2.5 text-left">Método</th>
                  <th className="px-3.5 py-2.5 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map(order => (
                  <tr key={order.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface2)] transition-colors cursor-pointer">
                    <td className="px-3.5 py-2.75"><span className="font-[var(--font-head)] text-[12px] text-[var(--muted)]">{order.num}</span></td>
                    <td className="px-3.5 py-2.75">
                      <div className="font-medium text-[12.5px]">{order.customer}</div>
                      <div className="text-[10.5px] text-[var(--muted)]">{order.time}</div>
                    </td>
                    <td className="px-3.5 py-2.75 text-[12px] text-[var(--muted)]">{order.product}</td>
                    <td className="px-3.5 py-2.75"><span className="font-[var(--font-head)] font-bold text-[13px]">{order.amount}</span></td>
                    <td className="px-3.5 py-2.75"><MethodBadge method={order.method} /></td>
                    <td className="px-3.5 py-2.75">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inbox */}
        <div className="card rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-[fadeUp_0.45s_ease_both]">
          <div className="border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
            <div className="font-[var(--font-head)] font-bold text-[13.5px]">💬 Inbox</div>
            <button className="text-[12px] text-[var(--accent)] font-medium cursor-pointer hover:opacity-75 transition-opacity">Ver todo →</button>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {CHATS.map(chat => (
              <div 
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors ${activeChat === chat.id ? 'bg-[var(--surface2)]' : 'hover:bg-[var(--surface2)]'}`}
              >
                <div className="relative w-9.5 h-9.5 rounded-lg bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center text-[16px] flex-shrink-0">
                  {chat.avatar}
                  <span className={`absolute -bottom-0.75 -right-0.75 w-3.75 h-3.75 rounded text-[7px] flex items-center justify-center border border-[var(--surface)] ${
                    chat.ch === 'wa' ? 'bg-[#25d366]' : chat.ch === 'ig' ? 'bg-gradient-to-br from-purple-600 via-red-500 to-orange-400' : 'bg-[var(--blue)]'
                  }`}>
                    {chat.ch === 'wa' ? '💬' : chat.ch === 'ig' ? '📸' : '🌐'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-[var(--text)] truncate">{chat.name}</div>
                  <div className="text-[11.5px] text-[var(--muted)] truncate">{chat.msg}</div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10.5px] text-[var(--muted)]">{chat.time}</span>
                  {chat.unread > 0 && (
                    <span className="min-w-[18px] h-[18px] bg-[var(--red)] rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">{chat.unread}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── ROW 4: CHATBOT + CATALOG + CONCILIATION ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4.5">
        {/* ChatBot + Catalog stacked */}
        <div className="space-y-4.5">
          {/* ChatBot */}
          <div className="card rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-[fadeUp_0.45s_ease_both]">
            <div className="border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
              <div className="font-[var(--font-head)] font-bold text-[13.5px] flex items-center gap-2">🤖 ChatBot IA · WhatsApp</div>
              <span className="text-[9.5px] font-bold px-2 py-0.75 rounded-full bg-green-500/13 text-green-500 border border-green-500/20">● ACTIVO</span>
            </div>
            <div className="p-4.5">
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[var(--surface2)] border border-[var(--border)] mb-3.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-[pulseGlow_2s_ease-in-out_infinite] flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-[12.5px] font-semibold">Valeria respondiendo automáticamente</div>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">API Oficial Meta · WhatsApp Business</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="text-center p-3 rounded-lg bg-[var(--surface2)] border border-[var(--border)]">
                  <div className="font-[var(--font-head)] text-2xl font-extrabold text-[var(--accent)] mb-1">43</div>
                  <div className="text-[10px] text-[var(--muted)] leading-tight">Respuestas enviadas</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-[var(--surface2)] border border-[var(--border)]">
                  <div className="font-[var(--font-head)] text-2xl font-extrabold text-green-500 mb-1">8</div>
                  <div className="text-[10px] text-[var(--muted)] leading-tight">Pedidos tomados</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-[var(--surface2)] border border-[var(--border)]">
                  <div className="font-[var(--font-head)] text-2xl font-extrabold text-blue-500 mb-1">92%</div>
                  <div className="text-[10px] text-[var(--muted)] leading-tight">Sin intervención humana</div>
                </div>
              </div>
            </div>
          </div>

          {/* Catalog Preview */}
          <div className="card rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-[fadeUp_0.45s_ease_both]">
            <div className="border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
              <div className="font-[var(--font-head)] font-bold text-[13.5px]">🛍️ Catálogo Online</div>
              <button className="text-[12px] text-[var(--accent)] font-medium cursor-pointer hover:opacity-75 transition-opacity">Editar →</button>
            </div>
            <div className="p-4.5">
              <div className="grid grid-cols-3 gap-2 mb-3.5">
                {[{ emoji:'👕', name:'Polo Classic', price:'$12', stock:24 }, { emoji:'👟', name:'Tenis Sport', price:'$45', stock:8, low:true }, { emoji:'👜', name:'Bolso Elegante', price:'$28', stock:15 }].map((p, i) => (
                  <div key={i} className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-3 text-center transition-colors hover:border-[var(--accent)]/20 cursor-pointer">
                    <div className="text-2xl mb-1.5">{p.emoji}</div>
                    <div className="text-[11px] font-semibold text-[var(--text)] truncate">{p.name}</div>
                    <div className="font-[var(--font-head)] font-bold text-[13px] text-[var(--accent)]">{p.price}</div>
                    <div className={`text-[10px] mt-0.5 ${p.low ? 'text-amber-500' : 'text-[var(--muted)]'}`}>Stock: {p.stock}</div>
                  </div>
                ))}
              </div>
              <button 
                onClick={copyCatalogUrl}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[var(--surface2)] border border-[var(--border)] cursor-pointer transition-colors hover:border-[var(--green)]/30"
              >
                <span className="text-xl flex-shrink-0">📲</span>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[11px] font-semibold">Compartir catálogo</div>
                  <div className="text-[10.5px] text-[var(--muted)] truncate">ventasve.app/c/mismodas2025</div>
                </div>
                <span className={`text-[11px] font-semibold px-3 py-1.25 rounded border border-[var(--border)] transition-colors ${copied ? 'border-[var(--green)] text-[var(--green)]' : 'text-[var(--muted)] hover:border-[var(--green)] hover:text-[var(--green)]'}`}>
                  {copied ? '✓ Copiado' : 'Copiar'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Conciliation */}
        <div className="card rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-[fadeUp_0.45s_ease_both]">
          <div className="border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
            <div>
              <div className="font-[var(--font-head)] font-bold text-[13.5px]">🔄 Conciliación</div>
              <div className="text-[11px] text-[var(--muted)] mt-0.5">
                {pendingCount} por confirmar
              </div>
            </div>
            <button 
              onClick={confirmAllPayments}
              className="text-[12px] text-[var(--accent)] font-medium cursor-pointer hover:opacity-75 transition-opacity"
            >
              Confirmar todos
            </button>
          </div>
          <div className="p-3.5 space-y-2.5">
            {payments.map(p => (
              <div key={p.id} className={`p-3.5 rounded-lg border transition-all ${p.status === 'CONFIRMED' ? 'border-green-500/20 bg-green-500/5' : 'border-[var(--border)] bg-[var(--surface2)]'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.25 h-2.25 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-[12px] font-bold">{p.method}</span>
                  <span className={`ml-auto text-[9.5px] font-bold px-1.75 py-0.5 rounded-full ${p.status === 'CONFIRMED' ? 'bg-green-500/13 text-green-500' : 'bg-amber-500/13 text-amber-400'}`}>
                    {p.status === 'CONFIRMED' ? '✓ Confirmado' : 'Pendiente'}
                  </span>
                </div>
                <div className="text-[11.5px] font-medium text-[var(--text)]">{p.client}</div>
                <div className="text-[10.5px] text-[var(--muted)] mb-2 truncate">{p.ref}</div>
                <div className="flex items-center justify-between">
                  <span className="font-[var(--font-head)] text-[17px] font-extrabold">{p.amount}</span>
                  <span className="text-[10px] text-[var(--muted)]">{p.ago}</span>
                </div>
                {p.status === 'PENDING' && (
                  <button 
                    onClick={() => verifyPayment(p.id)}
                    className="w-full mt-2.5 px-3 py-1.75 rounded-lg border border-green-500/20 bg-green-500/8 text-green-500 text-[11px] font-bold cursor-pointer transition-colors hover:bg-green-500/15"
                  >
                    ✓ Verificar pago
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
