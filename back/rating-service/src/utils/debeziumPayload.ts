import type { DeliveryOutboxInnerPayload } from '../types/deliveryOutbox';

export interface DebeziumEnvelope {
  payload?: string | DeliveryOutboxInnerPayload;
  schema?: unknown;
}

/**
 * Kafka value from Debezium: `payload` is often a JSON string of the business event.
 */
export function parseDebeziumDeliveryPayload(raw: string): DeliveryOutboxInnerPayload | null {
  try {
    const outer = JSON.parse(raw) as DebeziumEnvelope;
    const inner = outer.payload;
    if (inner === undefined || inner === null) return null;
    if (typeof inner === 'string') {
      return JSON.parse(inner) as DeliveryOutboxInnerPayload;
    }
    return inner;
  } catch {
    return null;
  }
}
