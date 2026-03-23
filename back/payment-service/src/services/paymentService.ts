import { PrismaClient, Prisma } from '@prisma/client';
import type { PaymentMethod, PaymentStatus } from '@prisma/client';

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
    // Only create payment for online orders.
    //if (orderEvent.paymentMethod !== 'ONLINE_PAYMENT') return;

    if (!this.isUuid(orderEvent.userId)) {
      console.error(
        `Invalid userId UUID from order event, skip creating payment. userId=${orderEvent.userId}, orderId=${orderEvent.orderId}`,
      );
      return;
    }

    const exists = await prisma.payments.findUnique({
      where: { order_id: orderEvent.orderId },
    });
    if (exists) return;

    await prisma.payments.create({
      data: {
        order_id: orderEvent.orderId,
        user_id: orderEvent.userId,
        amount: new Prisma.Decimal(orderEvent.totalAmount),
        payment_method: orderEvent.paymentMethod as PaymentMethod,
        status: 'PENDING' as PaymentStatus,
      },
    });
  }

  async handleGatewayResult(result: GatewayResult): Promise<void> {
    const payment = await prisma.payments.findUnique({
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

    await prisma.payments.update({
      where: { order_id: result.orderId },
      data: {
        status: paymentStatus,
        gateway_response: result.gatewayResponse,
        transaction_id: result.transactionId,
        paid_at: paidAt,
        failed_at: failedAt,
      },
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
}
