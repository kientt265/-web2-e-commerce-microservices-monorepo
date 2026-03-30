import { consumer } from '../config/kafka';
import { InventoryService } from './inventoryService';
import { ORDER_EVENTS, DELIVERY_EVENTS, PAYMENT_EVENTS } from '../constants/orderEvents';
import { OrderEvent, DeliveryEvent, PaymentEvent } from '../types/inventory';

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
          
          if (topic === 'outbox.order') {
            await this.handleOrderEvent(message);
          } else if (topic === 'outbox.delivery') {
            await this.handleDeliveryEvent(message);
          } else if (topic === 'outbox.payment') {
            await this.handlePaymentEvent(message);
          } else {
            console.log(`Ignoring message from topic: ${topic}`);
            return;
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

  private isValidDeliveryEvent(eventType: string): boolean {
    return Object.values(DELIVERY_EVENTS).includes(eventType as any);
  }

  private isValidPaymentEvent(eventType: string): boolean {
    return Object.values(PAYMENT_EVENTS).includes(eventType as any);
  }

  private async handleOrderEvent(message: any): Promise<void> {
    try {
      console.log('Raw order message:', message.value?.toString());
      
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
      console.error('❌ Error processing order Kafka message:', error);
      console.error('Message value:', message.value?.toString());
      // In production, you might want to implement dead letter queue here
    }
  }

  private async handleDeliveryEvent(message: any): Promise<void> {
    try {
      console.log('Raw delivery message:', message.value?.toString());
      
      // Parse Debezium message format
      const debeziumMessage = JSON.parse(message.value?.toString() || '{}');
      console.log('Debezium delivery message parsed:', JSON.stringify(debeziumMessage, null, 2));
      
      // Extract the actual delivery event from payload
      const deliveryEvent: DeliveryEvent = JSON.parse(debeziumMessage.payload || '{}');
      console.log('Delivery event extracted:', JSON.stringify(deliveryEvent, null, 2));
      console.log(`Event type: ${deliveryEvent.eventType}`);
      console.log(`Order ID: ${deliveryEvent.orderId}`);
      console.log(`Product ID: ${deliveryEvent.productId}`);
      console.log(`Quantity: ${deliveryEvent.quantity}`);
      
      // Process only the delivery events we care about
      if (this.isValidDeliveryEvent(deliveryEvent.eventType)) {
        console.log(`✅ Valid delivery event type, processing...`);
        await this.inventoryService.processDeliveryEvent(deliveryEvent);
        console.log(`✅ Successfully processed delivery event: ${deliveryEvent.eventType} for order ${deliveryEvent.orderId}`);
      } else {
        console.log(`❌ Ignoring delivery event type: ${deliveryEvent.eventType}`);
      }
    } catch (error) {
      console.error('❌ Error processing delivery Kafka message:', error);
      console.error('Message value:', message.value?.toString());
      // In production, you might want to implement dead letter queue here
    }
  }

  private async handlePaymentEvent(message: any): Promise<void> {
    try {
      console.log('Raw payment message:', message.value?.toString());
      
      // Parse Debezium message format
      const debeziumMessage = JSON.parse(message.value?.toString() || '{}');
      console.log('Debezium payment message parsed:', JSON.stringify(debeziumMessage, null, 2));
      
      // Extract the actual payment event from payload
      const paymentEvent: PaymentEvent = JSON.parse(debeziumMessage.payload || '{}');
      console.log('Payment event extracted:', JSON.stringify(paymentEvent, null, 2));
      console.log(`Event type: ${paymentEvent.event_type}`);
      console.log(`Order ID: ${paymentEvent.orderId}`);
      console.log(`Payment status: ${paymentEvent.status}`);
      
      // Process only the payment events we care about
      if (this.isValidPaymentEvent(paymentEvent.event_type)) {
        console.log(`✅ Valid payment event type, processing...`);
        await this.inventoryService.processPaymentEvent(paymentEvent);
        console.log(`✅ Successfully processed payment event: ${paymentEvent.event_type} for order ${paymentEvent.orderId}`);
      } else {
        console.log(`❌ Ignoring payment event type: ${paymentEvent.event_type}`);
      }
    } catch (error) {
      console.error('❌ Error processing payment Kafka message:', error);
      console.error('Message value:', message.value?.toString());
      // In production, you might want to implement dead letter queue here
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
