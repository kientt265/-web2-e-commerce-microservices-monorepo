import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { VNPayService } from '../services/vnpayService';
import { OrderService } from '../services/orderService';

const router = Router();

// Initialize services
const vnpayService = new VNPayService();
const orderService = new OrderService();
const paymentController = new PaymentController(vnpayService, orderService);

/**
 * @swagger
 * /api/orders/payment-url:
 *   post:
 *     summary: Create VNPay payment URL
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - amount
 *               - orderInfo
 *             properties:
 *               orderId:
 *                 type: string
 *                 example: "order_123456"
 *               amount:
 *                 type: number
 *                 example: 100000
 *               orderInfo:
 *                 type: string
 *                 example: "Thanh toan don hang #123456"
 *               bankCode:
 *                 type: string
 *                 example: "VNBANK"
 *     responses:
 *       200:
 *         description: Payment URL created successfully
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
 *                     paymentUrl:
 *                       type: string
 *                     orderId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/payment-url', paymentController.createPaymentUrl);

export default router;
