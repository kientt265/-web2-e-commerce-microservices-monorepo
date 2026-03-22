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
          
          if (topic !== 'outbox.delivery') {
            console.log(`Ignoring message from topic: ${topic}`);
            return;
          }

          try {
            console.log('Raw message:', message.value?.toString());
            
            // Parse Debezium message format
            const debeziumMessage = JSON.parse(message.value?.toString() || '{}');
            console.log('Debezium message parsed:', JSON.stringify(debeziumMessage, null, 2));
            
            // Extract the actual delivery event from payload (payload is a JSON string)
            const deliveryEvent: DeliveryEvent = JSON.parse(debeziumMessage.payload);
            console.log('Delivery event extracted:', JSON.stringify(deliveryEvent, null, 2));
            console.log(`Event type: ${deliveryEvent.eventType}`);
            console.log(`Order ID: ${deliveryEvent.orderId}`);
            console.log(`Delivery Status: ${deliveryEvent.status}`);
            
            // Process delivery events
            await this.processDeliveryEvent(deliveryEvent);
            console.log(`✅ Successfully processed delivery event for order ${deliveryEvent.orderId}`);
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

  private async processDeliveryEvent(deliveryEvent: DeliveryEvent): Promise<void> {
    try {
      // Handle potential double "order_" prefix in orderId
      let orderId = deliveryEvent.orderId;
      if (orderId.startsWith('order_order_')) {
        orderId = orderId.replace('order_order_', 'order_');
        console.log(`Fixed double prefix: ${deliveryEvent.orderId} → ${orderId}`);
      }
      
      switch (deliveryEvent.eventType) {
        case 'DELIVERY_CREATED':
          console.log(`📦 Delivery created for order ${orderId}`);
          // Update order status to PROCESSING when delivery is created
          await this.updateOrderStatus(orderId, 'PROCESSING');
          break;
          
        case 'DELIVERY_PICKED_UP':
          console.log(`🚚 Delivery picked up for order ${orderId}`);
          await this.updateOrderStatus(orderId, 'PROCESSING');
          break;
          
        case 'DELIVERY_DELIVERED':
          console.log(`✅ Order ${orderId} delivered successfully`);
          await this.updateOrderStatus(orderId, 'COMPLETED');
          break;
          
        case 'DELIVERY_FAILED':
          console.log(`❌ Delivery failed for order ${orderId}`);
          await this.updateOrderStatus(orderId, 'CANCELLED');
          break;
          
        case 'DELIVERY_CANCELLED':
          console.log(`🚫 Delivery cancelled for order ${orderId}`);
          await this.updateOrderStatus(orderId, 'CANCELLED');
          break;
          
        default:
          console.log(`⏭️ Unknown delivery event type: ${deliveryEvent.eventType}`);
      }
    } catch (error) {
      console.error(`❌ Error processing delivery event for order ${deliveryEvent.orderId}:`, error);
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

  async stopConsumer(): Promise<void> {
    try {
      await consumer.stop();
      console.log('Kafka consumer stopped');
    } catch (error) {
      console.error('Error stopping Kafka consumer:', error);
    }
  }
}
