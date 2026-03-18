import { Router } from 'express';
import {
  addItemToCart,
  clearCart,
  getOrCreateCartByUserId,
  listCartItems,
  removeItemFromCart,
  updateCartItem,
} from '../controllers/cartController';

const router = Router();

router.get('/health', (_req, res) => res.status(200).json({ ok: true, service: 'cart-service' }));

// Cart by user
router.get('/carts/:userId', getOrCreateCartByUserId);
router.get('/carts/:userId/items', listCartItems);
router.post('/carts/:userId/items', addItemToCart);
router.put('/carts/:userId/items/:itemId', updateCartItem);
router.delete('/carts/:userId/items/:itemId', removeItemFromCart);
router.delete('/carts/:userId/items', clearCart);

export default router;

