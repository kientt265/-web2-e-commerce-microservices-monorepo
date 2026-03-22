import { prisma } from '../lib/prisma';
import type { DeliveryOutboxInnerPayload, ParsedDeliveryDelivered } from '../types/deliveryOutbox';
import { parseProductIdToInt } from '../utils/productId';

function isDeliveredEvent(payload: DeliveryOutboxInnerPayload): boolean {
  const et = String(payload.eventType ?? '').trim().toUpperCase();
  if (et === 'DELIVERY_FAILED') return false;
  if (et === 'DELIVERY_DELIVERED') return true;
  const st = String(payload.status ?? '').trim().toUpperCase();
  return st === 'DELIVERED';
}

function parseOrderIdNumeric(payload: DeliveryOutboxInnerPayload): number | null {
  if (typeof payload.orderIdNumeric === 'number' && Number.isFinite(payload.orderIdNumeric)) {
    return payload.orderIdNumeric > 0 ? payload.orderIdNumeric : null;
  }
  if (typeof payload.orderId === 'string') {
    const m = /^order_(\d+)$/i.exec(payload.orderId.trim());
    if (m) {
      const n = parseInt(m[1], 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    const plain = parseInt(payload.orderId.trim(), 10);
    return Number.isFinite(plain) && plain > 0 ? plain : null;
  }
  return null;
}

function toParsed(payload: DeliveryOutboxInnerPayload): ParsedDeliveryDelivered | null {
  if (!payload.userId || typeof payload.userId !== 'string') return null;
  const orderNum = parseOrderIdNumeric(payload);
  if (orderNum === null) return null;

  const productId = parseProductIdToInt(payload.productId);
  if (productId === null) return null;

  const deliveryId =
    typeof payload.deliveryId === 'number' && Number.isFinite(payload.deliveryId)
      ? payload.deliveryId
      : null;

  let deliveredAt: Date | null = null;
  if (payload.timestamp) {
    const d = new Date(payload.timestamp);
    deliveredAt = Number.isNaN(d.getTime()) ? null : d;
  }

  return {
    userId: payload.userId,
    orderIdNumeric: orderNum,
    productId,
    deliveryId,
    deliveredAt,
  };
}

export class RatingEligibilityService {
  /**
   * Inserts a rating eligibility row when the delivery outbox says the order line was delivered.
   * Idempotent: duplicate (user, order, product) is ignored.
   */
  async createFromDeliveryOutboxPayload(payload: DeliveryOutboxInnerPayload): Promise<void> {
    if (!isDeliveredEvent(payload)) return;

    const parsed = toParsed(payload);
    if (!parsed) {
      console.warn('[rating-eligibility] Missing userId, orderIdNumeric, or productId in payload');
      return;
    }

    // Use $executeRaw so this works even if @prisma/client was loaded before `prisma generate`
    // (delegate `prisma.rating_eligibilities` can be undefined until Node restarts after generate).
    const inserted = await prisma.$executeRaw`
      INSERT INTO "rating_eligibilities" ("user_id", "order_id", "product_id", "delivery_id", "delivered_at")
      VALUES (
        ${parsed.userId}::uuid,
        ${parsed.orderIdNumeric},
        ${parsed.productId},
        ${parsed.deliveryId},
        ${parsed.deliveredAt}
      )
      ON CONFLICT ("user_id", "order_id", "product_id") DO NOTHING
    `;

    const count = typeof inserted === 'bigint' ? Number(inserted) : Number(inserted);
    if (count > 0) {
      console.log(
        `[rating-eligibility] Created eligibility user=${parsed.userId} order=${parsed.orderIdNumeric} product=${parsed.productId}`
      );
    } else {
      console.log(
        `[rating-eligibility] Eligibility already exists order=${parsed.orderIdNumeric} product=${parsed.productId}, skip`
      );
    }
  }
}

export const ratingEligibilityService = new RatingEligibilityService();
