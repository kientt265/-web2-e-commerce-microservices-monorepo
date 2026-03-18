import { Router } from 'express';
import { OrderController } from '../controllers/orderController';

const router = Router();
const orderController = new OrderController();

// POST /api/orders - Create a new order
router.post('/', orderController.createOrder);

// GET /api/orders/:orderId - Get order by ID
router.get('/:orderId', orderController.getOrderById);

// GET /api/orders/user/:userId - Get all orders for a user
router.get('/user/:userId', orderController.getOrdersByUserId);

export default router;
