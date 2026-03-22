/**
 * Inner JSON inside Debezium outbox `payload` for delivery events (outbox.delivery).
 */
export interface DeliveryOutboxInnerPayload {
  eventType?: string;
  status?: string;
  userId?: string;
  orderId?: string;
  orderIdNumeric?: number;
  productId?: string;
  deliveryId?: number;
  timestamp?: string;
}

export interface ParsedDeliveryDelivered {
  userId: string;
  orderIdNumeric: number;
  productId: number;
  deliveryId: number | null;
  deliveredAt: Date | null;
}
