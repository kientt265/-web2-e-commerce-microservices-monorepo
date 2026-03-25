import { consumer } from '../config/kafka';
import { OrderService } from './orderService';
import { DeliveryEvent } from '../types/order';

export class KafkaConsumerService {
  private orderService: OrderService;

  constructor(orderService?: OrderService) {
    this.orderService = orderService || new OrderService();
  }

  async startConsumer(): Promise<void> {
    try {
      await consumer.run({
        eachMessage: async ({ topic, partition, message }: { topic: string; partition: number; message: any }) => {
          console.log(`Received message from topic: ${topic}, partition: ${partition}`);
          
          if (topic !== 'outbox.delivery' && topic !== 'outbox.payment') {
            console.log(`Ignoring message from topic: ${topic}`);
            return;
          }

          try {
            console.log('Raw message:', message.value?.toString());
            
            // Parse Debezium message format
            const debeziumMessage = JSON.parse(message.value?.toString() || '{}');
            console.log('Debezium message parsed:', JSON.stringify(debeziumMessage, null, 2));
            
            if (topic === 'outbox.delivery') {
              // Extract the actual delivery event from payload (payload is a JSON string)
              const deliveryEvent: DeliveryEvent = JSON.parse(debeziumMessage.payload);
              console.log('Delivery event extracted:', JSON.stringify(deliveryEvent, null, 2));
              
              // Process delivery events
              await this.processDeliveryEvent(deliveryEvent);
              console.log(`✅ Successfully processed delivery event for order ${deliveryEvent.orderId}`);
            } else if (topic === 'outbox.payment') {
              // Extract the actual payment event from payload (payload is a JSON string)
              const paymentEvent = JSON.parse(debeziumMessage.payload);
              console.log('Payment event extracted:', JSON.stringify(paymentEvent, null, 2));
              
              // Process payment events
              await this.processPaymentEvent(paymentEvent);
              console.log(`✅ Successfully processed payment event for order ${paymentEvent.orderId}`);
            }
          } catch (error) {
            console.error('❌ Error processing Kafka message:', error);
            console.error('Message value:', message.value?.toString());
          }
        },
      });
    } catch (error) {
      console.error('❌ Error starting Kafka consumer:', error);
      throw error;
    }
  }

  private async processDeliveryEvent(deliveryEvent: any): Promise<void> {
    try {
      // Handle potential double "order_" prefix in orderId
      let orderId = deliveryEvent.orderId;
      if (orderId.startsWith('order_order_')) {
        orderId = orderId.replace('order_order_', 'order_');
        console.log(`Fixed double prefix: ${deliveryEvent.orderId} → ${orderId}`);
      }
      
      const deliveryStatus = deliveryEvent.status;
      console.log(`📦 Processing delivery event: ${deliveryEvent.eventType} for order ${orderId}, status: ${deliveryStatus}`);

      // Update delivery_status in orders table
      await this.updateOrderDeliveryStatus(orderId, deliveryStatus);

      // Only update order status to COMPLETED when delivery_status is DELIVERED
      if (deliveryStatus === 'DELIVERED') {
        console.log(`✅ Order ${orderId} has been delivered. Updating order status to completed.`);
        await this.updateOrderStatus(orderId, 'completed');
      } else if (deliveryStatus === 'FAILED' || deliveryStatus === 'CANCELLED') {
        console.log(`❌ Delivery ${deliveryStatus} for order ${orderId}. Updating order status to cancelled.`);
        await this.updateOrderStatus(orderId, 'cancelled');
      }
    } catch (error) {
      console.error(`❌ Error processing delivery event for order ${deliveryEvent.orderId}:`, error);
      throw error;
    }
  }

  private async updateOrderDeliveryStatus(orderId: string, deliveryStatus: string): Promise<void> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      await prisma.orders.update({
        where: { id: orderId },
        data: { 
          delivery_status: deliveryStatus as any,
          updated_at: new Date()
        }
      });

      console.log(`✅ Updated order ${orderId} delivery_status to ${deliveryStatus}`);
    } catch (error) {
      console.error(`❌ Error updating order ${orderId} delivery status:`, error);
      throw error;
    }
  }

  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      // Import PrismaClient here to avoid circular dependency
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      await prisma.orders.update({
        where: { id: orderId },
        data: { 
          status: status.toLowerCase(),
          updated_at: new Date()
        }
      });

      console.log(`✅ Updated order ${orderId} status to ${status}`);
    } catch (error) {
      console.error(`❌ Error updating order ${orderId} status:`, error);
      throw error;
    }
  }

  private async processPaymentEvent(paymentEvent: any): Promise<void> {
    try {
      const orderId = paymentEvent.orderId;
      const status = paymentEvent.status; // e.g., "COMPLETED"
      const eventType = paymentEvent.event_type;

      console.log(`💳 Processing payment event: ${eventType} for order ${orderId}, status: ${status}`);

      if (status) {
        await this.updateOrderPaymentStatus(orderId, status);
      }
    } catch (error) {
      console.error(`❌ Error processing payment event:`, error);
      throw error;
    }
  }

  private async updateOrderPaymentStatus(orderId: string, paymentStatus: string): Promise<void> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      await prisma.orders.update({
        where: { id: orderId },
        data: { 
          payment_status: paymentStatus as any,
          updated_at: new Date()
        }
      });

      console.log(`✅ Updated order ${orderId} payment_status to ${paymentStatus}`);
    } catch (error) {
      console.error(`❌ Error updating order ${orderId} payment status:`, error);
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
