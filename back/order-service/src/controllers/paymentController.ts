import { Request, Response } from 'express';
import { VNPayService } from '../services/vnpayService';
import { OrderService } from '../services/orderService';

export class PaymentController {
  constructor(
    private vnpayService: VNPayService,
    private orderService: OrderService
  ) {}

  createPaymentUrl = async (req: Request, res: Response) => {
    try {
      const { orderId, amount, orderInfo, bankCode } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';

      if (!orderId || !amount || !orderInfo) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'orderId, amount, and orderInfo are required',
        });
      }

      const paymentUrl = this.vnpayService.createPaymentUrl({
        orderId,
        amount,
        orderInfo,
        ipAddress,
        bankCode,
      });

      res.status(200).json({
        success: true,
        data: {
          paymentUrl,
          orderId,
          amount,
        },
        message: 'Payment URL created successfully',
      });
    } catch (error) {
      console.error('Error creating payment URL:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create payment URL',
      });
    }
  };
}
