import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate UUID-like string
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface PaymentCompletedOutboxData {
  paymentId: number;
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  status: string;
}

export const savePaymentCompletedOutbox = async (
  tx: PrismaClient | any,
  data: PaymentCompletedOutboxData
) => {
  const outboxEvent = {
    id: generateUUID(), // ✅ Proper UUID format
    event_type: 'PAYMENT_COMPLETED',
    payload: {
      paymentId: data.paymentId,
      orderId: data.orderId,
      userId: data.userId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId,
      status: data.status,
      timestamp: new Date().toISOString(),
    },
    aggregateid: data.orderId,
    aggregatetype: 'payment',
    type: 'PAYMENT_COMPLETED',
  };

  return await tx.outbox.create({
    data: outboxEvent,
  });
};

export const savePaymentFailedOutbox = async (
  tx: PrismaClient | any,
  data: PaymentCompletedOutboxData
) => {
  const outboxEvent = {
    id: generateUUID(), // ✅ Proper UUID format
    event_type: 'PAYMENT_FAILED',
    payload: {
      paymentId: data.paymentId,
      orderId: data.orderId,
      userId: data.userId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId,
      status: data.status,
      timestamp: new Date().toISOString(),
    },
    aggregateid: data.orderId,
    aggregatetype: 'payment',
    type: 'PAYMENT_FAILED',
  };

  return await tx.outbox.create({
    data: outboxEvent,
  });
};
