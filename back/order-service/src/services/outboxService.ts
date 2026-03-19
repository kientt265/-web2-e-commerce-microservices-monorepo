import { PrismaClient } from '@prisma/client';
import { OrderEvent } from '../types/order';
import { randomUUID } from 'crypto';
const prisma = new PrismaClient();

export class OutboxService {
  async saveOrderEvent(orderEvent: OrderEvent): Promise<void> {
    try {
      await prisma.outbox.create({
        data: {
          id: randomUUID(),
          event_type: orderEvent.eventType,
          payload: {
            eventType: orderEvent.eventType,
            orderId: orderEvent.orderId,
            userId: orderEvent.userId,
            items: orderEvent.items,
            totalAmount: orderEvent.totalAmount,
            shippingAddress: orderEvent.shippingAddress,
            paymentMethod: orderEvent.paymentMethod,
            timestamp: orderEvent.timestamp,
          },
          aggregateid: orderEvent.orderId,
          aggregatetype: 'order',
          type: orderEvent.eventType,
        },
      });

      console.log(`Order event saved to outbox: ${orderEvent.eventType} for order ${orderEvent.orderId}`);
    } catch (error) {
      console.error('Error saving order event to outbox:', error);
      throw new Error('Failed to save order event to outbox');
    }
  }
}
