'use client';

import Link from 'next/link';
import { useCart } from '@/lib/hooks/useCart';

type CartLinkProps = {
  slug: string;
};

export const CartLink = ({ slug }: CartLinkProps) => {
  const { totalItems } = useCart(slug);

  return (
    <Link
      href={`/${slug}/cart`}
      className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--foreground)]"
    >
      Carrito{totalItems > 0 ? ` (${totalItems})` : ''}
    </Link>
  );
};

