import { consumer } from '../config/kafka';
import { DeliveryOutboxController } from '../controllers/deliveryOutboxController';

const OUTBOX_DELIVERY_TOPIC = 'outbox.delivery';

export class DeliveryOutboxConsumer {
  constructor(private readonly deliveryOutboxController: DeliveryOutboxController) {}

  async start(): Promise<void> {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (topic !== OUTBOX_DELIVERY_TOPIC) {
          return;
        }
        try {
          console.log(
            `[kafka] ${OUTBOX_DELIVERY_TOPIC} partition=${partition} offset=${message.offset}`
          );
          await this.deliveryOutboxController.handleKafkaMessageValue(message.value);
        } catch (err) {
          console.error('[kafka] Error handling outbox.delivery message:', err);
        }
      },
    });
  }
}
