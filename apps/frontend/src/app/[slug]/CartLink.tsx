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
      className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700"
    >
      Carrito{totalItems > 0 ? ` (${totalItems})` : ''}
    </Link>
  );
};

