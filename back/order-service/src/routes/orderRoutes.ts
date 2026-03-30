import { Router } from 'express';
import { OrderController } from '../controllers/orderController';

const router = Router();
const orderController = new OrderController();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - items
 *               - totalAmount
 *               - shippingAddress
 *               - paymentMethod
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "user_123456"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       example: "product_123"
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *                     price:
 *                       type: number
 *                       example: 99.99
 *               totalAmount:
 *                 type: number
 *                 example: 199.98
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "123 Main St"
 *                   city:
 *                     type: string
 *                     example: "New York"
 *                   state:
 *                     type: string
 *                     example: "NY"
 *                   zipCode:
 *                     type: string
 *                     example: "10001"
 *                   country:
 *                     type: string
 *                     example: "USA"
 *               paymentMethod:
 *                 type: string
 *                 enum: [ONLINE_PAYMENT, CASH_ON_DELIVERY]
 *                 example: "ONLINE_PAYMENT"
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     items:
 *                       type: array
 *                     totalAmount:
 *                       type: number
 *                     status:
 *                       type: string
 *                     paymentMethod:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                     shippingAddress:
 *                       type: object
 *                     createdAt:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                     paymentUrl:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - missing required fields or invalid data
 *       500:
 *         description: Internal server error
 */
router.post('/', orderController.createOrder);

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID (format: order_123456)
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     items:
 *                       type: array
 *                     totalAmount:
 *                       type: number
 *                     status:
 *                       type: string
 *                     paymentMethod:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                     shippingAddress:
 *                       type: object
 *                     createdAt:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get('/:orderId', orderController.getOrderById);

/**
 * @swagger
 * /api/orders/{orderId}/status:
 *   get:
 *     summary: Get order status by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                     deliveryStatus:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get('/:orderId/status', orderController.getOrderStatus);

/**
 * @swagger
 * /api/orders/user/{userId}:
 *   get:
 *     summary: Get all orders for a user
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       orderId:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       items:
 *                         type: array
 *                       totalAmount:
 *                         type: number
 *                       status:
 *                         type: string
 *                       paymentMethod:
 *                         type: string
 *                       paymentStatus:
 *                         type: string
 *                       shippingAddress:
 *                         type: object
 *                       createdAt:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *                 count:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userId', orderController.getOrdersByUserId);

export default router;
