import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

export const DELIVERY_OUTBOX_EVENT = {
  DELIVERED: 'DELIVERY_DELIVERED',
  FAILED: 'DELIVERY_FAILED',
} as const;

type OutcomeStatus = keyof typeof DELIVERY_OUTBOX_EVENT;

/**
 * Inserts a row into outbox (same DB transaction as delivery updates) for Debezium → Kafka (outbox.delivery).
 */
export async function saveDeliveryOutcomeOutbox(
  tx: Prisma.TransactionClient,
  params: {
    deliveryId: number;
    orderId: number;
    status: OutcomeStatus;
    userId?: string | null;
    productId?: string | null;
    quantity?: number | null;
  }
): Promise<void> {
  const eventType = DELIVERY_OUTBOX_EVENT[params.status];
  const orderIdStr = `order_${params.orderId}`;

  await tx.outbox.create({
    data: {
      id: randomUUID(),
      event_type: eventType,
      payload: {
        eventType,
        deliveryId: params.deliveryId,
        orderId: orderIdStr,
        orderIdNumeric: params.orderId,
        userId: params.userId ?? null,
        productId: params.productId ?? null,
        quantity: params.quantity ?? null,
        status: params.status,
        timestamp: new Date().toISOString(),
      },
      aggregateid: orderIdStr,
      aggregatetype: 'delivery',
      type: eventType,
    },
  });
}
