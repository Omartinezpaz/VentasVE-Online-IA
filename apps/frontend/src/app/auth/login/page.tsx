'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { setAccessToken } from '@/lib/auth/storage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await authApi.login({ email, password });
      setAccessToken(response.data.accessToken);
      router.push('/dashboard/orders');
    } catch {
      setError('Correo o contraseña incorrectos');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-xl">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-zinc-50">
            Inicia sesión en VentasVE
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Dashboard para dueños. Usa el correo con el que registraste tu negocio.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              placeholder="tucorreo@negocio.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          {error && (
            <p className="text-xs text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-zinc-900 shadow disabled:opacity-70"
          >
            {submitting ? 'Entrando...' : 'Entrar al dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}

