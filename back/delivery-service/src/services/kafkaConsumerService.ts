import {consumer} from '../config/kafka';
import { DeliveryService } from './deliveryService';
import { OrderEvent } from '../types/delivery';

export class KafkaConsumerService {
  private deliveryService: DeliveryService;

  constructor(deliveryService: DeliveryService) {
    this.deliveryService = deliveryService;
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
            console.log(`Payment method: ${orderEvent.paymentMethod}`);
            console.log(`Items count: ${orderEvent.items?.length || 0}`);
            
            // Process both cash on delivery and online payment orders
            if (orderEvent.paymentMethod === 'CASH_ON_DELIVERY') {
              console.log(`💰 Processing cash on delivery order: ${orderEvent.orderId}`);
              await this.deliveryService.processOrderEvent(orderEvent, 'PENDING');
              console.log(`✅ Successfully processed COD order event for order ${orderEvent.orderId}`);
            } else if (orderEvent.paymentMethod === 'ONLINE_PAYMENT') {
              console.log(`� Processing online payment order: ${orderEvent.orderId}`);
              await this.deliveryService.processOrderEvent(orderEvent, 'AWAITING_PAYMENT');
              console.log(`✅ Successfully processed online payment order event for order ${orderEvent.orderId}`);
            } else {
              console.log(`❌ Unknown payment method: ${orderEvent.paymentMethod}`);
            }
          } catch (error) {
            console.error('❌ Error processing Kafka message:', error);
            console.error('Message value:', message.value?.toString());
            // In production, you might want to implement dead letter queue here
          }
        },
      });
    } catch (error) {
      console.error('❌ Error starting Kafka consumer:', error);
      throw error;
    }
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
