import { consumer } from '../config/kafka';
import { InventoryService } from './inventoryService';
import { ORDER_EVENTS } from '../constants/orderEvents';
import { OrderEvent } from '../types/inventory';

export class KafkaConsumerService {
  private inventoryService: InventoryService;

  constructor(inventoryService: InventoryService) {
    this.inventoryService = inventoryService;
  }

  async startConsumer(): Promise<void> {
    try {
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (topic !== 'order-events') {
            return;
          }

          try {
            const orderEvent: OrderEvent = JSON.parse(message.value?.toString() || '{}');
            
            console.log(`Received order event: ${orderEvent.eventType} for order ${orderEvent.orderId}`);
            
            // Process only the order events we care about
            if (this.isValidOrderEvent(orderEvent.eventType)) {
              await this.inventoryService.processOrderEvent(orderEvent);
            } else {
              console.log(`Ignoring event type: ${orderEvent.eventType}`);
            }
          } catch (error) {
            console.error('Error processing Kafka message:', error);
            // In production, you might want to implement dead letter queue here
          }
        },
      });

      console.log('Kafka consumer started successfully');
    } catch (error) {
      console.error('Error starting Kafka consumer:', error);
      throw error;
    }
  }

  private isValidOrderEvent(eventType: string): boolean {
    return Object.values(ORDER_EVENTS).includes(eventType as any);
  }

  async stopConsumer(): Promise<void> {
    try {
      await consumer.stop();
      console.log('Kafka consumer stopped');
    } catch (error) {
      console.error('Error stopping Kafka consumer:', error);
    }
  }
}
