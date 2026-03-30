import { parseDebeziumDeliveryPayload } from '../utils/debeziumPayload';
import { ratingEligibilityService } from '../services/ratingEligibilityService';

/**
 * HTTP-style controller for Kafka: maps raw bytes to domain service calls.
 */
export class DeliveryOutboxController {
  async handleKafkaMessageValue(value: Buffer | null): Promise<void> {
    const raw = value?.toString() ?? '';
    if (!raw) return;

    const payload = parseDebeziumDeliveryPayload(raw);
    if (!payload) {
      console.warn('[delivery-outbox] Could not parse Debezium payload');
      return;
    }

    await ratingEligibilityService.createFromDeliveryOutboxPayload(payload);
  }
}
