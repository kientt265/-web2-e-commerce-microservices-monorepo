import { PrismaClient, Prisma } from '@prisma/client';
import type { PaymentMethod, PaymentStatus } from '@prisma/client';
import { savePaymentCompletedOutbox, savePaymentFailedOutbox } from './outboxService';

const prisma = new PrismaClient();

type GatewayResult = {
  orderId: string;
  isSuccess: boolean;
  gatewayResponse: any;
  amount?: number | string; // If provided, already in VND
  transactionId?: string;
};

type OrderEvent = {
  eventType: string;
  orderId: string;
  userId: string;
  totalAmount: number;
  paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY';
  timestamp: string;
};

export class PaymentService {
  private isUuid(value: string): boolean {
    // Basic UUID v1-v5 validation (Prisma expects Postgres UUID format).
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  async createPendingPaymentFromOrderEvent(orderEvent: OrderEvent): Promise<void> {
    console.log('🔧 Creating payment from order event:', orderEvent);
    
    // Only create payment for online orders.
    //if (orderEvent.paymentMethod !== 'ONLINE_PAYMENT') return;

    if (!this.isUuid(orderEvent.userId)) {
      console.error(
        `Invalid userId UUID from order event, skip creating payment. userId=${orderEvent.userId}, orderId=${orderEvent.orderId}`,
      );
      return;
    }

    console.log(`🔍 Checking if payment exists for orderId: ${orderEvent.orderId}`);
    const exists = await prisma.payments.findUnique({
      where: { order_id: orderEvent.orderId },
    });
    if (exists) {
      console.log(`⚠️ Payment already exists for orderId: ${orderEvent.orderId}`);
      return;
    }

    console.log(`💾 Creating new payment record for orderId: ${orderEvent.orderId}`);
    await prisma.payments.create({
      data: {
        order_id: orderEvent.orderId,
        user_id: orderEvent.userId,
        amount: new Prisma.Decimal(orderEvent.totalAmount),
        payment_method: orderEvent.paymentMethod as PaymentMethod,
        status: 'PENDING' as PaymentStatus,
      },
    });
    console.log(`✅ Payment record created successfully for orderId: ${orderEvent.orderId}`);
  }

  async handleGatewayResult(result: GatewayResult): Promise<void> {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payments.findUnique({
        where: { order_id: result.orderId },
      });

      if (!payment) {
        throw new Error(`Payment record not found for orderId=${result.orderId}`);
      }

      // Validate amount when possible (helps prevent tampering / mismatch).
      if (result.amount !== undefined) {
        const expected = Number(payment.amount);
        const received = Number(result.amount);
        if (Number.isFinite(expected) && Number.isFinite(received) && expected !== received) {
          throw new Error(`Payment amount mismatch for orderId=${result.orderId}`);
        }
      }

      const paymentStatus: PaymentStatus = result.isSuccess ? 'COMPLETED' : 'FAILED';
      const paidAt = result.isSuccess ? new Date() : null;
      const failedAt = result.isSuccess ? null : new Date();

      const updatedPayment = await tx.payments.update({
        where: { order_id: result.orderId },
        data: {
          status: paymentStatus,
          gateway_response: result.gatewayResponse,
          transaction_id: result.transactionId,
          paid_at: paidAt,
          failed_at: failedAt,
        },
      });

      // Save outbox event for other services
      const outboxData = {
        paymentId: updatedPayment.id,
        orderId: result.orderId,
        userId: payment.user_id,
        amount: Number(payment.amount),
        paymentMethod: payment.payment_method,
        transactionId: result.transactionId,
        status: paymentStatus,
      };

      if (result.isSuccess) {
        await savePaymentCompletedOutbox(tx, outboxData);
        console.log(`✅ Payment completed outbox event saved for order ${result.orderId}`);
      } else {
        await savePaymentFailedOutbox(tx, outboxData);
        console.log(`❌ Payment failed outbox event saved for order ${result.orderId}`);
      }

      console.log(`✅ Payment status updated: ${result.orderId} → ${paymentStatus}`);
    });
  }

  // Backward-compatible wrapper for your existing internal webhook endpoint.
  async processPaymentStatus(orderId: string, status: 'SUCCESS' | 'FAILED', paymentData: any): Promise<void> {
    await this.handleGatewayResult({
      orderId,
      isSuccess: status === 'SUCCESS',
      gatewayResponse: paymentData,
      transactionId: paymentData?.vnp_TransactionNo ?? paymentData?.vnp_TransactionId,
      // vnp_Amount is in VND (library-calculated). If you send custom webhook payloads,
      // include `vnp_Amount` so amount can be validated/matched upstream.
      amount: paymentData?.vnp_Amount ? Number(paymentData.vnp_Amount) : undefined,
    });
  }

  async getPaymentByOrderId(orderId: string) {
    return prisma.payments.findUnique({ where: { order_id: orderId } });
  }

  async updatePaymentFromDeliveryEvent(deliveryEvent: {
    status: string;
    orderId: string;
    userId: string;
    deliveryId?: number;
    timestamp: string;
  }): Promise<void> {
    // Normalize orderId - handle cases like "order_order_xxx" -> "order_xxx"
    let normalizedOrderId = deliveryEvent.orderId;
    if (deliveryEvent.orderId.startsWith('order_order_')) {
      normalizedOrderId = deliveryEvent.orderId.replace('order_order_', 'order_');
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payments.findUnique({
        where: { order_id: normalizedOrderId },
      });

      if (!payment) {
        console.warn(`⚠️ Payment record not found for orderId: ${normalizedOrderId}`);
        return;
      }

      // Map delivery status to payment status
      let paymentStatus: PaymentStatus | null = null;
      
      if (deliveryEvent.status === 'DELIVERED') {
        paymentStatus = 'COMPLETED';
      } else if (deliveryEvent.status === 'CANCELLED') {
        paymentStatus = 'CANCELLED';
      } else if (deliveryEvent.status === 'RETURNED') {
        paymentStatus = 'REFUNDED';
      } else if (deliveryEvent.status === 'FAILED') {
        paymentStatus = 'FAILED';
      } else {
        console.log(`⚠️ Unhandled delivery status: ${deliveryEvent.status}, skipping payment update`);
        return;
      }

      const updatedPayment = await tx.payments.update({
        where: { order_id: normalizedOrderId },
        data: {
          status: paymentStatus,
          updated_at: new Date(),
        },
      });

      // Save outbox event for other services
      const outboxData = {
        paymentId: updatedPayment.id,
        orderId: normalizedOrderId,
        userId: payment.user_id,
        amount: Number(payment.amount),
        paymentMethod: payment.payment_method,
        status: paymentStatus,
      };

      if (paymentStatus === 'COMPLETED') {
        await savePaymentCompletedOutbox(tx, outboxData);
        console.log(`✅ Payment completed outbox event saved for order ${normalizedOrderId}`);
      } else if (paymentStatus === 'CANCELLED') {
        await savePaymentFailedOutbox(tx, outboxData);
        console.log(`❌ Payment cancelled outbox event saved for order ${normalizedOrderId}`);
      } else if (paymentStatus === 'REFUNDED') {
        await savePaymentFailedOutbox(tx, outboxData);
        console.log(`💰 Payment refunded outbox event saved for order ${normalizedOrderId}`);
      } else if (paymentStatus === 'FAILED') {
        await savePaymentFailedOutbox(tx, outboxData);
        console.log(`❌ Payment failed outbox event saved for order ${normalizedOrderId}`);
      }

      console.log(`✅ Payment status updated: ${normalizedOrderId} → ${paymentStatus} (from delivery: ${deliveryEvent.status})`);
    });
  }
}
