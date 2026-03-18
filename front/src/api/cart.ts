import { fetchJson } from './http';

export type Cart = {
  id: number;
  user_id: string;
  cart_items: CartItem[];
};

export type CartItem = {
  id: number;
  cart_id: number;
  product_id: number;
  quantity: number;
  price_at_added: string; // Decimal serialized
};

export async function getOrCreateCart(baseUrl: string, userId: string) {
  return await fetchJson<Cart>(`${baseUrl}/carts/${userId}`);
}

export async function listCartItems(baseUrl: string, userId: string) {
  return await fetchJson<{ cartId: number; items: CartItem[] }>(`${baseUrl}/carts/${userId}/items`);
}

export async function addCartItem(
  baseUrl: string,
  userId: string,
  body: { productId: number; quantity: number; priceAtAdded: string },
) {
  return await fetchJson<{ cartId: number; item: CartItem }>(`${baseUrl}/carts/${userId}/items`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateCartItem(
  baseUrl: string,
  userId: string,
  itemId: number,
  quantity: number,
) {
  return await fetchJson<CartItem>(`${baseUrl}/carts/${userId}/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(baseUrl: string, userId: string, itemId: number) {
  return await fetchJson<{}>(`${baseUrl}/carts/${userId}/items/${itemId}`, { method: 'DELETE' });
}

export async function clearCart(baseUrl: string, userId: string) {
  return await fetchJson<{}>(`${baseUrl}/carts/${userId}/items`, { method: 'DELETE' });
}

