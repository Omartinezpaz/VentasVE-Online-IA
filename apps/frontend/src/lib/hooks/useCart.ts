'use client';

import { useEffect, useMemo, useState } from 'react';

export type CartItem = {
  productId: string;
  name: string;
  priceUsdCents: number;
  quantity: number;
};

const getStorageKey = (slug: string) => `ventasve_cart_${slug}`;

export const useCart = (slug: string) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (!slug) return [];
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(getStorageKey(slug));
      if (!raw) return [];
      return JSON.parse(raw) as CartItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!slug) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(getStorageKey(slug), JSON.stringify(items));
    } catch {
    }
  }, [slug, items]);

  const addItem = (item: CartItem) => {
    setItems(current => {
      const existing = current.find(i => i.productId === item.productId);
      if (existing) {
        return current.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...current, item];
    });
  };

  const removeItem = (productId: string) => {
    setItems(current => current.filter(i => i.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setItems(current =>
      current.map(i =>
        i.productId === productId ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalCents = useMemo(
    () => items.reduce((acc, item) => acc + item.priceUsdCents * item.quantity, 0),
    [items]
  );

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  return { items, addItem, removeItem, updateQuantity, clearCart, totalCents, totalItems };
};
