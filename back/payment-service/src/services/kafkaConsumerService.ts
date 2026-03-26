import { consumer } from '../config/kafka';
import { PaymentService } from './paymentService';

const ORDER_EVENTS = {
  ORDER_CREATED_ONLINE_PAYMENT: 'ORDER_CREATED_ONLINE_PAYMENT',
} as const;

const DELIVERY_EVENTS = {
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

type OrderEvent = {
  eventType: string;
  orderId: string;
  userId: string;
  items?: Array<{ productId: string; quantity: number; price: number }>;
  totalAmount: number;
  shippingAddress?: any;
  paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY';
  timestamp: string;
};

type DeliveryEvent = {
  status: string;
  orderId: string;
  userId: string;
  deliveryId: number;
  timestamp: string;
};

export class KafkaConsumerService {
  constructor(private paymentService: PaymentService) {}

  async startConsumer(): Promise<void> {
    try {
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          console.log(`🔔 Received message from topic: ${topic}, partition: ${partition}`);
          
          if (topic === 'outbox.order') {
            await this.handleOrderEvent(message);
          } else if (topic === 'outbox.delivery') {
            await this.handleDeliveryEvent(message);
          } else {
            console.log(`❌ Ignoring unknown topic: ${topic}`);
          }
        },
      });
      console.log('Kafka consumer started successfully');
    } catch (error) {
      console.error('Error starting Kafka consumer:', error);
      throw error;
    }
  }

  private async handleOrderEvent(message: any): Promise<void> {
    try {
      const rawMessage = message.value?.toString() || '{}';
      console.log('📨 Raw Kafka message:', rawMessage);
      
      const debeziumMessage = JSON.parse(rawMessage);
      console.log('📋 Debezium message:', debeziumMessage);
      
      const orderEvent = JSON.parse(debeziumMessage.payload || '{}') as OrderEvent;
      console.log('🛒 Parsed order event:', orderEvent);

      await this.paymentService.createPendingPaymentFromOrderEvent(orderEvent);
      console.log('✅ Payment record created successfully');
    } catch (error) {
      console.error('❌ Error processing order event in payment-service:', error);
      console.error('Message value:', message.value?.toString());
    }
  }

  private async handleDeliveryEvent(message: any): Promise<void> {
    try {
      const rawMessage = message.value?.toString() || '{}';
      console.log('📨 Raw delivery Kafka message:', rawMessage);
      
      const debeziumMessage = JSON.parse(rawMessage);
      console.log('📋 Debezium delivery message:', debeziumMessage);
      
      const deliveryEvent = JSON.parse(debeziumMessage.payload || '{}') as DeliveryEvent;
      console.log('🚚 Parsed delivery event:', deliveryEvent);

      await this.paymentService.updatePaymentFromDeliveryEvent(deliveryEvent);
      console.log('✅ Payment status updated from delivery event');
    } catch (error) {
      console.error('❌ Error processing delivery event in payment-service:', error);
      console.error('Message value:', message.value?.toString());
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

