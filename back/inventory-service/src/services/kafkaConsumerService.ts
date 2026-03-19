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
          console.log(`Received message from topic: ${topic}, partition: ${partition}`);
          
          if (topic !== 'outbox.order') {
            console.log(`Ignoring message from topic: ${topic}`);
            return;
          }

          try {
            console.log('Raw message:', message.value?.toString());
            
            // Parse Debezium message format
            const debeziumMessage = JSON.parse(message.value?.toString() || '{}');
            console.log('Debezium message parsed:', JSON.stringify(debeziumMessage, null, 2));
            
            // Extract the actual order event from payload
            const orderEvent: OrderEvent = JSON.parse(debeziumMessage.payload || '{}');
            console.log('Order event extracted:', JSON.stringify(orderEvent, null, 2));
            console.log(`Event type: ${orderEvent.eventType}`);
            console.log(`Order ID: ${orderEvent.orderId}`);
            console.log(`Items count: ${orderEvent.items?.length || 0}`);
            
            // Process only the order events we care about
            if (this.isValidOrderEvent(orderEvent.eventType)) {
              console.log(`✅ Valid event type, processing...`);
              await this.inventoryService.processOrderEvent(orderEvent);
              console.log(`✅ Successfully processed order event: ${orderEvent.eventType} for order ${orderEvent.orderId}`);
            } else {
              console.log(`❌ Ignoring event type: ${orderEvent.eventType}`);
            }
          } catch (error) {
            console.error('❌ Error processing Kafka message:', error);
            console.error('Message value:', message.value?.toString());
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
