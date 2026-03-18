import { useEffect, useMemo, useState } from 'react';
import type { CartItem } from '../api/cart';
import * as cartApi from '../api/cart';

export type CartUiItem = CartItem & {
  name?: string;
  image?: string;
  stock?: number;
};

export function useCart(cartBaseUrl: string, userId: string, onLog: (line: string) => void) {
  const [cartId, setCartId] = useState<number | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    const res = await cartApi.listCartItems(cartBaseUrl, userId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setCartId(res.data.cartId);
    setItems(res.data.items ?? []);
    return true;
  };

  useEffect(() => {
    // new userId (guest -> logged in) should load the new cart
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartBaseUrl, userId]);

  const addItem = async (product: { id: number; name: string; price: string; stock: number }, quantity = 1) => {
    if (product.stock <= 0) return false;
    setLoading(true);
    setError(null);
    const res = await cartApi.addCartItem(cartBaseUrl, userId, {
      productId: product.id,
      quantity,
      priceAtAdded: product.price,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    onLog(`[cart] Added: ${product.name}`);
    return await refresh();
  };

  const updateQty = async (itemId: number, quantity: number) => {
    setLoading(true);
    setError(null);
    const res = await cartApi.updateCartItem(cartBaseUrl, userId, itemId, quantity);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    return await refresh();
  };

  const removeItem = async (itemId: number) => {
    setLoading(true);
    setError(null);
    const res = await cartApi.removeCartItem(cartBaseUrl, userId, itemId);
    setLoading(false);
    if (!res.ok && res.status !== 204) {
      setError(res.error);
      return false;
    }
    onLog('[cart] Removed item');
    return await refresh();
  };

  const clear = async () => {
    setLoading(true);
    setError(null);
    const res = await cartApi.clearCart(cartBaseUrl, userId);
    setLoading(false);
    if (!res.ok && res.status !== 204) {
      setError(res.error);
      return false;
    }
    onLog('[cart] Cleared');
    return await refresh();
  };

  const count = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items]);
  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * Number(it.price_at_added), 0),
    [items],
  );

  return {
    cartId,
    items,
    loading,
    error,
    count,
    total,
    refresh,
    addItem,
    updateQty,
    removeItem,
    clear,
  };
}

