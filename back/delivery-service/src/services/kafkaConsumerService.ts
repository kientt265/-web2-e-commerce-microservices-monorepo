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
          console.log(`🔔 Received message from topic: ${topic}, partition: ${partition}`);
          
          // Handle order events
          if (topic === 'outbox.order') {
            await this.handleOrderEvent(message);
          }
          // Handle payment events
          else if (topic === 'outbox.payment') {
            await this.handlePaymentEvent(message);
          }
          else {
            console.log(`❌ Ignoring message from topic: ${topic}`);
            return;
          }
        },
      });
    } catch (error) {
      console.error('❌ Error starting Kafka consumer:', error);
      throw error;
    }
  }

  private async handleOrderEvent(message: any) {
    try {
      console.log('📨 Raw order message:', message.value?.toString());
      
      // Parse Debezium message format
      const debeziumMessage = JSON.parse(message.value?.toString() || '{}');
      console.log('📋 Debezium message parsed:', JSON.stringify(debeziumMessage, null, 2));
      
      // Extract the actual order event from payload
      const orderEvent: OrderEvent = JSON.parse(debeziumMessage.payload || '{}');
      console.log('🛒 Parsed order event:', JSON.stringify(orderEvent, null, 2));
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
        console.log(`💳 Processing online payment order: ${orderEvent.orderId}`);
        await this.deliveryService.processOrderEvent(orderEvent, 'AWAITING_PAYMENT');
        console.log(`✅ Successfully processed online payment order event for order ${orderEvent.orderId}`);
      } else {
        console.log(`❌ Unknown payment method: ${orderEvent.paymentMethod}`);
      }
    } catch (error) {
      console.error('❌ Error processing order Kafka message:', error);
      console.error('Message value:', message.value?.toString());
    }
  }

  private async handlePaymentEvent(message: any) {
    try {
      console.log('💳 Raw payment message:', message.value?.toString());
      
      // Parse Debezium message format
      const debeziumMessage = JSON.parse(message.value?.toString() || '{}');
      console.log('📋 Payment Debezium message parsed:', JSON.stringify(debeziumMessage, null, 2));
      
      // Extract the actual payment event from payload
      const paymentEvent = JSON.parse(debeziumMessage.payload || '{}');
      console.log('💰 Parsed payment event:', JSON.stringify(paymentEvent, null, 2));
      console.log(`Event type: ${paymentEvent.event_type}`);
      console.log(`Order ID: ${paymentEvent.orderId}`);
      console.log(`Payment status: ${paymentEvent.status}`);
      console.log(`Payment method: ${paymentEvent.paymentMethod}`);
      
      // Process payment completed events for online payment orders
      if (paymentEvent.event_type === 'PAYMENT_COMPLETED' && paymentEvent.paymentMethod === 'ONLINE_PAYMENT') {
        console.log(`✅ Payment completed for online order: ${paymentEvent.orderId}`);
        await this.deliveryService.updateDeliveryStatusFromPayment(paymentEvent.orderId, 'PENDING');
        console.log(`🚚 Updated delivery status to PENDING for order ${paymentEvent.orderId}`);
      } else if (paymentEvent.event_type === 'PAYMENT_FAILED' && paymentEvent.paymentMethod === 'ONLINE_PAYMENT') {
        console.log(`❌ Payment failed for online order: ${paymentEvent.orderId}`);
        await this.deliveryService.updateDeliveryStatusFromPayment(paymentEvent.orderId, 'CANCELLED');
        console.log(`🚫 Updated delivery status to CANCELLED for order ${paymentEvent.orderId}`);
      } else {
        console.log(`⏭️ Ignoring payment event: ${paymentEvent.event_type} for ${paymentEvent.paymentMethod}`);
      }
    } catch (error) {
      console.error('❌ Error processing payment Kafka message:', error);
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
