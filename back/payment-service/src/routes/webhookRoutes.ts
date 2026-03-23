import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { PaymentService } from '../services/paymentService';
import { VnPayController } from '../controllers/vnpayController';

const router = Router();

// Initialize services
const paymentService = new PaymentService();
const webhookController = new WebhookController(paymentService);
const vnPayController = new VnPayController(paymentService);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Receive payment status webhook from order service
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - status
 *               - timestamp
 *             properties:
 *               orderId:
 *                 type: string
 *                 example: "order_123456"
 *               status:
 *                 type: string
 *                 enum: [SUCCESS, FAILED]
 *                 example: "SUCCESS"
 *               paymentData:
 *                 type: object
 *                 description: Payment gateway response data
 *                 example:
 *                   vnp_TxnRef: "order_123456"
 *                   vnp_ResponseCode: "00"
 *                   vnp_Amount: "10000000"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-03-19T12:00:00.000Z"
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     processedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/webhook', webhookController.paymentWebhook);

/**
 * @swagger
 * /api/payments/webhook/test:
 *   post:
 *     summary: Test webhook endpoint (for development/testing)
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Test webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     paymentData:
 *                       type: object
 *                     timestamp:
 *                       type: string
 *       500:
 *         description: Internal server error
 */
router.post('/webhook/test', webhookController.testWebhook);

/**
 * @swagger
 * /api/payments/vnpay-return:
 *   get:
 *     summary: VNPay return URL (UI feedback; business logic handled via IPN)
 *     tags: [VNPay]
 *     responses:
 *       200:
 *         description: VNPay return handled successfully
 *       400:
 *         description: VNPay return verification failed
 */
router.get('/vnpay-return', vnPayController.vnpayReturn);

/**
 * @swagger
 * /api/payments/vnpay-ipn:
 *   get:
 *     summary: VNPay IPN endpoint to verify and update payment status
 *     tags: [VNPay]
 *     responses:
 *       200:
 *         description: VNPay IPN processed successfully
 */
router.get('/vnpay-ipn', vnPayController.vnpayIpn);

export default router;
