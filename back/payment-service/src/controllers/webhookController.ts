import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';

export interface WebhookPaymentRequest {
  orderId: string;
  status: 'SUCCESS' | 'FAILED';
  paymentData: any;
  timestamp: string;
}

export class WebhookController {
  constructor(private paymentService: PaymentService) {}

  paymentWebhook = async (req: Request, res: Response) => {
    try {
      const { orderId, status, paymentData, timestamp }: WebhookPaymentRequest = req.body;

      // Validate required fields
      if (!orderId || !status || !timestamp) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'orderId, status, and timestamp are required',
        });
      }

      // Process payment status update
      await this.paymentService.processPaymentStatus(orderId, status, paymentData);

      console.log(`✅ Payment webhook processed: Order ${orderId} - Status: ${status}`);

      res.status(200).json({
        success: true,
        message: 'Payment webhook processed successfully',
        data: {
          orderId,
          status,
          processedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Error processing payment webhook:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process payment webhook',
      });
    }
  };

  // Test endpoint for webhook
  testWebhook = async (req: Request, res: Response) => {
    try {
      const testData: WebhookPaymentRequest = {
        orderId: 'test_order_' + Date.now(),
        status: 'SUCCESS',
        paymentData: {
          vnp_TxnRef: 'test_order_' + Date.now(),
          vnp_ResponseCode: '00',
          vnp_Amount: '10000000',
        },
        timestamp: new Date().toISOString(),
      };

      // Create a pending payment record so the internal webhook can update it.
      await this.paymentService.createPendingPaymentFromOrderEvent({
        eventType: 'ORDER_CREATED_ONLINE_PAYMENT',
        orderId: testData.orderId,
        userId: '00000000-0000-0000-0000-000000000000',
        paymentMethod: 'ONLINE_PAYMENT',
        totalAmount: Number(testData.paymentData.vnp_Amount),
        timestamp: new Date().toISOString(),
      });

      await this.paymentService.processPaymentStatus(testData.orderId, testData.status, testData.paymentData);

      res.status(200).json({
        success: true,
        message: 'Test webhook processed successfully',
        data: testData,
      });
    } catch (error) {
      console.error('❌ Error processing test webhook:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process test webhook',
      });
    }
  };
}
