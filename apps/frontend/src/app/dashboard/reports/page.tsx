'use client';

import { useEffect, useState } from 'react';
import { metricsApi, DashboardStats } from '@/lib/api/metrics';

export default function ReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await metricsApi.getStats({ period: 'month' });
        setStats(res.data);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) return <div className="text-[var(--muted)]">Cargando reportes...</div>;
  if (!stats) return <div>Error al cargar estadísticas</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-xl font-bold text-[var(--foreground)]">Reportes de Ventas</h1>
        <p className="text-xs text-[var(--muted)]">Análisis detallado del rendimiento de tu negocio.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-elevated rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
            <h2 className="font-heading text-sm font-bold mb-6 text-[var(--foreground)] flex items-center gap-2">
                <span className="text-lg">💰</span> Ingresos por Periodo
            </h2>
            <div className="space-y-6">
                {Object.entries(stats.sales).map(([period, data]: [string, any]) => (
                    <div key={period} className="space-y-2">
                        <div className="flex justify-between items-end">
                            <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">{period === 'day' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes'}</div>
                            <div className="font-heading text-lg font-bold text-[var(--foreground)]">
                                ${(data.usdCents / 100).toLocaleString()}
                            </div>
                        </div>
                        <div className="h-2 w-full bg-[var(--background)] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[var(--accent)] rounded-full shadow-[0_0_8px_rgba(232,54,14,0.4)]"
                                style={{ width: period === 'month' ? '100%' : period === 'week' ? '40%' : '15%' }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="card-elevated rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
            <h2 className="font-heading text-sm font-bold mb-6 text-[var(--foreground)] flex items-center gap-2">
                <span className="text-lg">💳</span> Ventas por Método de Pago
            </h2>
            <div className="space-y-4">
                {(stats.salesByPaymentMethod || []).map((item, i) => (
                    <div key={item.paymentMethod} className="flex items-center gap-4">
                        <div className="w-20 text-[10px] font-bold text-[var(--muted)] uppercase">{item.paymentMethod}</div>
                        <div className="flex-1 h-2 bg-[var(--background)] rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${i === 0 ? 'bg-purple-500' : i === 1 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, (item.usdCents / stats.sales.month.usdCents) * 100)}%` }}
                            />
                        </div>
                        <div className="text-xs font-bold text-[var(--foreground)] min-w-[60px] text-right">
                            ${(item.usdCents / 100).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="card-elevated rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl md:col-span-2">
            <h2 className="font-heading text-sm font-bold mb-6 text-[var(--foreground)] flex items-center gap-2">
                <span className="text-lg">📦</span> Estados de Pedidos
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(stats.ordersByStatus || []).map(item => (
                    <div key={item.status} className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] text-center space-y-1">
                        <div className="font-heading text-2xl font-bold text-[var(--foreground)]">{item.count}</div>
                        <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-tight">{item.status}</div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
