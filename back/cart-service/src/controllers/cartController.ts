import type { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseDecimal(raw: unknown): Prisma.Decimal | null {
  if (raw === undefined || raw === null || raw === '') return null;
  try {
    return new Prisma.Decimal(raw as any);
  } catch {
    return null;
  }
}

async function getOrCreateCart(userId: string) {
  const existing = await prisma.carts.findFirst({
    where: { user_id: userId },
    include: { cart_items: true },
  });
  if (existing) return existing;
  return await prisma.carts.create({
    data: {
      user_id: userId,
      created_at: new Date(),
      updated_at: new Date(),
    },
    include: { cart_items: true },
  });
}

export async function getOrCreateCartByUserId(req: Request, res: Response) {
  const userId = req.params.userId;
  if (!isUuid(userId)) return res.status(400).json({ error: 'userId must be a UUID' });

  try {
    const cart = await getOrCreateCart(userId);
    return res.status(200).json(cart);
  } catch (err) {
    console.error('getOrCreateCartByUserId error:', err);
    return res.status(500).json({ error: 'Failed to fetch cart' });
  }
}

export async function listCartItems(req: Request, res: Response) {
  const userId = req.params.userId;
  if (!isUuid(userId)) return res.status(400).json({ error: 'userId must be a UUID' });

  try {
    const cart = await getOrCreateCart(userId);
    const items = await prisma.cart_items.findMany({
      where: { cart_id: cart.id },
      orderBy: { updated_at: 'desc' },
    });
    return res.status(200).json({ cartId: cart.id, items });
  } catch (err) {
    console.error('listCartItems error:', err);
    return res.status(500).json({ error: 'Failed to list cart items' });
  }
}

export async function addItemToCart(req: Request, res: Response) {
  const userId = req.params.userId;
  if (!isUuid(userId)) return res.status(400).json({ error: 'userId must be a UUID' });

  const body = req.body as {
    productId?: number | string;
    quantity?: number | string;
    priceAtAdded?: number | string;
  };

  const productId = body.productId !== undefined ? parseId(String(body.productId)) : null;
  if (!productId) return res.status(400).json({ error: 'productId is required and must be a positive integer' });

  const quantity = body.quantity === undefined ? 1 : Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) return res.status(400).json({ error: 'quantity must be a positive integer' });

  const priceAtAdded = parseDecimal(body.priceAtAdded);
  if (!priceAtAdded) return res.status(400).json({ error: 'priceAtAdded is required and must be a valid decimal' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cart = await tx.carts.findFirst({ where: { user_id: userId } });
      const cartRow =
        cart ??
        (await tx.carts.create({
          data: { user_id: userId, created_at: new Date(), updated_at: new Date() },
        }));

      const existing = await tx.cart_items.findFirst({
        where: { cart_id: cartRow.id, product_id: productId },
      });

      let item;
      if (existing) {
        item = await tx.cart_items.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + quantity,
            price_at_added: priceAtAdded,
            updated_at: new Date(),
          },
        });
      } else {
        item = await tx.cart_items.create({
          data: {
            cart_id: cartRow.id,
            product_id: productId,
            quantity,
            price_at_added: priceAtAdded,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }

      await tx.carts.update({
        where: { id: cartRow.id },
        data: { updated_at: new Date() },
      });

      return { cartId: cartRow.id, item };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('addItemToCart error:', err);
    return res.status(500).json({ error: 'Failed to add item to cart' });
  }
}

export async function updateCartItem(req: Request, res: Response) {
  const userId = req.params.userId;
  if (!isUuid(userId)) return res.status(400).json({ error: 'userId must be a UUID' });
  const itemId = parseId(req.params.itemId);
  if (!itemId) return res.status(400).json({ error: 'Invalid itemId' });

  const body = req.body as { quantity?: number | string };
  const quantity = body.quantity === undefined ? null : Number(body.quantity);
  if (quantity === null || !Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'quantity is required and must be a positive integer' });
  }

  try {
    const cart = await prisma.carts.findFirst({ where: { user_id: userId } });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const item = await prisma.cart_items.findUnique({ where: { id: itemId } });
    if (!item || item.cart_id !== cart.id) return res.status(404).json({ error: 'Cart item not found' });

    const updated = await prisma.cart_items.update({
      where: { id: itemId },
      data: { quantity, updated_at: new Date() },
    });
    await prisma.carts.update({ where: { id: cart.id }, data: { updated_at: new Date() } });
    return res.status(200).json(updated);
  } catch (err) {
    console.error('updateCartItem error:', err);
    return res.status(500).json({ error: 'Failed to update cart item' });
  }
}

export async function removeItemFromCart(req: Request, res: Response) {
  const userId = req.params.userId;
  if (!isUuid(userId)) return res.status(400).json({ error: 'userId must be a UUID' });
  const itemId = parseId(req.params.itemId);
  if (!itemId) return res.status(400).json({ error: 'Invalid itemId' });

  try {
    const cart = await prisma.carts.findFirst({ where: { user_id: userId } });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const item = await prisma.cart_items.findUnique({ where: { id: itemId } });
    if (!item || item.cart_id !== cart.id) return res.status(404).json({ error: 'Cart item not found' });

    await prisma.cart_items.delete({ where: { id: itemId } });
    await prisma.carts.update({ where: { id: cart.id }, data: { updated_at: new Date() } });
    return res.status(204).send();
  } catch (err) {
    console.error('removeItemFromCart error:', err);
    return res.status(500).json({ error: 'Failed to remove cart item' });
  }
}

export async function clearCart(req: Request, res: Response) {
  const userId = req.params.userId;
  if (!isUuid(userId)) return res.status(400).json({ error: 'userId must be a UUID' });

  try {
    const cart = await prisma.carts.findFirst({ where: { user_id: userId } });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    await prisma.cart_items.deleteMany({ where: { cart_id: cart.id } });
    await prisma.carts.update({ where: { id: cart.id }, data: { updated_at: new Date() } });
    return res.status(204).send();
  } catch (err) {
    console.error('clearCart error:', err);
    return res.status(500).json({ error: 'Failed to clear cart' });
  }
}

