'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { customersApi, Customer } from '@/lib/api/customers';
import { getAccessToken } from '@/lib/auth/storage';

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('es-VE');
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    const load = async () => {
      try {
        const response = await customersApi.list({
          limit: 50,
          search: search || undefined
        });
        setCustomers(response.data.data);
      } catch {
        setError('No se pudieron cargar los clientes');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, search]);

  if (loading) {
    return (
      <div className="py-6 text-sm text-zinc-400">
        Cargando clientes...
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

  if (!customers.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-50">
            Clientes
          </h2>
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="w-64 rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-sm text-zinc-400">
          Aún no tienes clientes registrados desde el catálogo.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-50">
          Clientes
        </h2>
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="w-64 rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500"
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
        <table className="min-w-full divide-y divide-zinc-800 text-xs">
          <thead className="bg-zinc-900/80">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Cliente
              </th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Contacto
              </th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Dirección
              </th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Órdenes
              </th>
              <th className="px-3 py-2 text-left font-medium text-zinc-500">
                Última compra
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {customers.map(customer => (
              <tr key={customer.id} className="hover:bg-zinc-900/80">
                <td className="px-3 py-2">
                  <Link
                    href={`/dashboard/customers/${customer.id}`}
                    className="font-medium text-zinc-100"
                  >
                    {customer.name || 'Sin nombre'}
                  </Link>
                  {customer.identification && (
                    <div className="text-[10px] text-zinc-500">
                      {customer.identification}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="text-zinc-200">
                    {customer.phone || 'Sin teléfono'}
                  </div>
                  {customer.email && (
                    <div className="text-[10px] text-zinc-500">
                      {customer.email}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-200">
                  {customer.address && (
                    <div>
                      <div>{customer.address}</div>
                      {customer.addressNotes && (
                        <div className="text-[10px] text-zinc-500">
                          {customer.addressNotes}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-200">
                  {customer._count?.orders ?? 0}
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  {customer.orders && customer.orders[0]
                    ? formatDate(customer.orders[0].createdAt)
                    : 'Nunca'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

