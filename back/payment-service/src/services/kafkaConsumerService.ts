import { consumer } from '../config/kafka';
import { PaymentService } from './paymentService';

const ORDER_EVENTS = {
  ORDER_CREATED_ONLINE_PAYMENT: 'ORDER_CREATED_ONLINE_PAYMENT',
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

export class KafkaConsumerService {
  constructor(private paymentService: PaymentService) {}

  async startConsumer(): Promise<void> {
    try {
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          console.log(`🔔 Received message from topic: ${topic}, partition: ${partition}`);
          
          if (topic !== 'outbox.order') {
            console.log(`❌ Ignoring topic: ${topic}`);
            return;
          }

          try {
            const rawMessage = message.value?.toString() || '{}';
            console.log('📨 Raw Kafka message:', rawMessage);
            
            const debeziumMessage = JSON.parse(rawMessage);
            console.log('📋 Debezium message:', debeziumMessage);
            
            const orderEvent = JSON.parse(debeziumMessage.payload || '{}') as OrderEvent;
            console.log('🛒 Parsed order event:', orderEvent);

            // if (orderEvent.eventType === ORDER_EVENTS.ORDER_CREATED_ONLINE_PAYMENT) {
            //   await this.paymentService.createPendingPaymentFromOrderEvent(orderEvent);
            // }
            await this.paymentService.createPendingPaymentFromOrderEvent(orderEvent);
            console.log('✅ Payment record created successfully');
          } catch (error) {
            console.error('❌ Error processing Kafka message in payment-service:', error);
            console.error('Message value:', message.value?.toString());
          }
        },
      });
      console.log('Kafka consumer started successfully');
    } catch (error) {
      console.error('Error starting Kafka consumer:', error);
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

