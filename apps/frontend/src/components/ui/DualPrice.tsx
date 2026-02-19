'use client';

import { useExchangeRate } from '@/lib/hooks/useExchangeRate';

type DualPriceProps = {
  usdCents: number;
  businessId?: string;
  className?: string;
  showBoth?: boolean;
};

export const DualPrice = ({
  usdCents,
  businessId,
  className = '',
  showBoth = true
}: DualPriceProps) => {
  const { formatBs, formatUsd, loading } = useExchangeRate(businessId);

  if (!showBoth) {
    return <span className={className}>{formatUsd(usdCents)}</span>;
  }

  if (loading) {
    return <span className={className}>{formatUsd(usdCents)}</span>;
  }

  return (
    <span className={className}>
      <span className="font-semibold">{formatUsd(usdCents)}</span>
      <span className="ml-2 text-xs text-zinc-500">
        ({formatBs(usdCents)})
      </span>
    </span>
  );
};

