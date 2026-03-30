import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

export const INVENTORY_OUTBOX_EVENT = {
  QUANTITY_UPDATED: 'INVENTORY_QUANTITY_UPDATED',
  INVENTORY_CREATED: 'INVENTORY_CREATED',
  RESERVED_CHECKOUT_UPDATED: 'INVENTORY_RESERVED_CHECKOUT_UPDATED',
  RESERVED_SHIPPING_UPDATED: 'INVENTORY_RESERVED_SHIPPING_UPDATED',
} as const;

type InventoryEventType = keyof typeof INVENTORY_OUTBOX_EVENT;

interface QuantityChange {
  previousQuantity: number;
  newQuantity: number;
  change: number;
}

/**
 * Lưu thay đổi số lượng inventory vào outbox để Debezium → Kafka → product-service
 */
export async function saveInventoryQuantityOutbox(
  tx: Prisma.TransactionClient,
  params: {
    inventoryId: number;
    productId: string;
    eventType: InventoryEventType;
    quantityChange: QuantityChange;
    reservedCheckout?: number;
    reservedShipping?: number;
    orderId?: string;
    reason?: string;
  }
): Promise<void> {
  console.log(`📝 saveInventoryQuantityOutbox called for product ${params.productId}`);
  
  const eventType = INVENTORY_OUTBOX_EVENT[params.eventType];
  const aggregateId = `product_${params.productId}`;

  console.log(`📤 Creating outbox event: ${eventType}, aggregateId: ${aggregateId}`);

  try {
    const outboxRecord = await tx.outbox.create({
      data: {
        id: randomUUID(),
        event_type: eventType,
        payload: {
          eventType,
          inventoryId: params.inventoryId,
          productId: params.productId,
          previousQuantity: params.quantityChange.previousQuantity,
          newQuantity: params.quantityChange.newQuantity,
          change: params.quantityChange.change,
          reservedCheckout: params.reservedCheckout ?? null,
          reservedShipping: params.reservedShipping ?? null,
          // availableQuantity: params.quantityChange.newQuantity - (params.reservedCheckout ?? 0) - (params.reservedShipping ?? 0),
          orderId: params.orderId ?? null,
          reason: params.reason ?? null,
          timestamp: new Date().toISOString(),
        },
        aggregateid: aggregateId,
        aggregatetype: 'inventory',
        type: eventType,
      },
    });
    
    console.log(`✅ Outbox record created successfully: ${outboxRecord.id}`);
  } catch (error) {
    console.error(`❌ Error creating outbox record:`, error);
    throw error;
  }
}

/**
 * Lưu thông tin inventory mới được tạo vào outbox
 */
export async function saveInventoryCreatedOutbox(
  tx: Prisma.TransactionClient,
  params: {
    inventoryId: number;
    productId: string;
    initialQuantity: number;
    minThreshold: number;
    location?: string;
  }
): Promise<void> {
  const eventType = INVENTORY_OUTBOX_EVENT.INVENTORY_CREATED;
  const aggregateId = `product_${params.productId}`;

  await tx.outbox.create({
    data: {
      id: randomUUID(),
      event_type: eventType,
      payload: {
        eventType,
        inventoryId: params.inventoryId,
        productId: params.productId,
        quantity: params.initialQuantity,
        availableQuantity: params.initialQuantity,
        reservedCheckout: 0,
        reservedShipping: 0,
        minThreshold: params.minThreshold,
        location: params.location ?? null,
        timestamp: new Date().toISOString(),
      },
      aggregateid: aggregateId,
      aggregatetype: 'inventory',
      type: eventType,
    },
  });
}
