'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { customersApi, Customer } from '@/lib/api/customers';
import { getAccessToken } from '@/lib/auth/storage';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('es-VE', { dateStyle: 'short' });

// ─── SKELETON ROW ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="h-3.5 w-32 rounded bg-[var(--surface2)]" />
        <div className="mt-1.5 h-2.5 w-20 rounded bg-[var(--surface2)]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-28 rounded bg-[var(--surface2)]" />
        <div className="mt-1.5 h-2.5 w-36 rounded bg-[var(--surface2)]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-40 rounded bg-[var(--surface2)]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-6 rounded bg-[var(--surface2)]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-20 rounded bg-[var(--surface2)]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-6 w-16 rounded-lg bg-[var(--surface2)]" />
      </td>
    </tr>
  );
}

// ─── AVATAR INITIAL ───────────────────────────────────────────────────────────
function CustomerAvatar({ name }: { name?: string | null }) {
  const initials = name
    ? name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface2)] text-[11px] font-bold text-[var(--muted)] border border-[var(--border)]">
      {initials}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── DEBOUNCE SEARCH ──────────────────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  };

  // cleanup timeout on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ─── LOAD CUSTOMERS ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await customersApi.list({
        limit: 50,
        search: debouncedSearch || undefined,
      });
      setCustomers(response.data.data);
      setTotal(response.data.meta?.total ?? response.data.data.length);
    } catch {
      setError('No se pudieron cargar los clientes');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace('/auth/login'); return; }
    load();
  }, [router, load]);

  // ─── HEADER (shared — evita código duplicado) ─────────────────────────────
  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg font-bold text-[var(--foreground)]">Clientes</h1>
        {!loading && !error && (
          <p className="text-xs text-[var(--muted)]">
            {total > 0 ? `${total} cliente${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}` : 'Sin clientes aún'}
          </p>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs pointer-events-none">🔍</span>
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-8 pr-4 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 sm:w-72"
        />
        {search && (
          <button
            type="button"
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition text-xs"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );

  // ─── ERROR STATE ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        {header}
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200 flex items-center justify-between">
          <span>⚠ {error}</span>
          <button
            type="button"
            onClick={load}
            className="text-xs text-red-400 hover:text-red-200 underline transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ─── EMPTY STATE ──────────────────────────────────────────────────────────
  const isEmpty = !loading && customers.length === 0;

  return (
    <div className="space-y-4">
      {header}

      {/* Empty — sin búsqueda activa */}
      {isEmpty && !debouncedSearch && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] py-16 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Aún no tienes clientes</p>
          <p className="text-xs text-[var(--muted)] mt-1 max-w-xs">
            Los clientes aparecen automáticamente cuando realizan un pedido desde tu catálogo público.
          </p>
        </div>
      )}

      {/* Empty — búsqueda sin resultados */}
      {isEmpty && debouncedSearch && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] py-12 text-center">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Sin resultados</p>
          <p className="text-xs text-[var(--muted)] mt-1">
            No encontramos clientes para <span className="text-[var(--foreground)]">"{debouncedSearch}"</span>
          </p>
          <button
            type="button"
            onClick={() => handleSearchChange('')}
            className="mt-3 text-xs text-[#f5c842] hover:underline"
          >
            Limpiar búsqueda
          </button>
        </div>
      )}

      {/* Table — loading skeleton OR real data */}
      {(loading || customers.length > 0) && (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="min-w-full divide-y divide-[var(--border)] text-xs">
            <thead className="bg-[var(--background)]">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Cliente</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Contacto</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] hidden md:table-cell">Dirección</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Órdenes</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] hidden sm:table-cell">Última compra</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {/* Skeleton rows while loading */}
              {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

              {/* Real rows */}
              {!loading && customers.map(customer => (
                <tr
                  key={customer.id}
                  className="group hover:bg-[var(--background)]/40 transition-colors"
                >
                  {/* Name + identification */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <CustomerAvatar name={customer.name} />
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors truncate block"
                        >
                          {customer.name || 'Sin nombre'}
                        </Link>
                        {customer.identification && (
                          <div className="text-[10px] text-[var(--muted)] truncate">{customer.identification}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Phone + email */}
                  <td className="px-4 py-3">
                    {customer.phone ? (
                      <a
                        href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[var(--foreground)] hover:text-[#25d366] transition-colors w-fit"
                      >
                        <span>💬</span> {customer.phone}
                      </a>
                    ) : (
                      <span className="text-[var(--muted)]">Sin teléfono</span>
                    )}
                    {customer.email && (
                      <div className="mt-0.5 text-[10px] text-[var(--muted)] truncate max-w-[160px]">
                        {customer.email}
                      </div>
                    )}
                  </td>

                  {/* Address */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    {customer.address ? (
                      <div className="max-w-[180px]">
                        <div className="text-[var(--foreground)] truncate">{customer.address}</div>
                        {customer.addressNotes && (
                          <div className="text-[10px] text-[var(--muted)] truncate">{customer.addressNotes}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Order count */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                      (customer._count?.orders ?? 0) > 0
                        ? 'bg-[#f5c842]/10 text-[#f5c842] border border-[#f5c842]/20'
                        : 'bg-[var(--surface2)] text-[var(--muted)]'
                    }`}>
                      {customer._count?.orders ?? 0}
                    </span>
                  </td>

                  {/* Last order */}
                  <td className="px-4 py-3 text-[var(--muted)] hidden sm:table-cell">
                    {customer.orders?.[0]
                      ? formatDate(customer.orders[0].createdAt)
                      : <span className="text-[var(--muted)]">Nunca</span>
                    }
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/customers/${customer.id}`}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
