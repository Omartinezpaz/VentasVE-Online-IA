'use client';

import { useEffect, useState } from 'react';
import { whatsappApi } from '@/lib/api/whatsapp';
import { getAccessToken } from '@/lib/auth/storage';

type Status = 'idle' | 'loading' | 'connected' | 'disconnected';

export const WhatsappStatusBadge = () => {
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    const fetchStatus = async () => {
      try {
        setStatus('loading');
        const response = await whatsappApi.getStatus();
        if (response.data.connected) {
          setStatus('connected');
        } else {
          setStatus('disconnected');
        }
      } catch {
        setStatus('disconnected');
      }
    };

    fetchStatus();
  }, []);

  if (status === 'idle') {
    return null;
  }

  const label =
    status === 'connected'
      ? 'WhatsApp conectado'
      : status === 'loading'
        ? 'Verificando WhatsApp...'
        : 'WhatsApp desconectado';

  const dotColor =
    status === 'connected'
      ? 'bg-emerald-400'
      : status === 'loading'
        ? 'bg-amber-400'
        : 'bg-[var(--muted)]';

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      <span className="text-[11px] font-medium text-[var(--foreground)]">
        {label}
      </span>
    </div>
  );
};
