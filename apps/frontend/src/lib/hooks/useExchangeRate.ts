'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

type ExchangeRate = {
  id: string;
  usdToVes: number;
  date: string;
  businessId?: string | null;
};

export const useExchangeRate = (businessId?: string) => {
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const response = await api.get('/exchange-rate/current', {
          params: businessId ? { businessId } : {}
        });
        setRate(response.data);
      } catch {
        setError('No se pudo obtener la tasa de cambio');
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, [businessId]);

  const formatBs = (usdCents: number) => {
    if (!rate) return 'Bs. ?';
    const usd = usdCents / 100;
    const bs = usd * rate.usdToVes;
    return `Bs. ${bs.toFixed(2)}`.replace('.', ',');
  };

  const formatUsd = (usdCents: number) => {
    return `$${(usdCents / 100).toFixed(2)}`;
  };

  return {
    rate,
    loading,
    error,
    formatBs,
    formatUsd
  };
};

