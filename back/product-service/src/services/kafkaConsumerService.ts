import { consumer } from '../config/kafka';
import { PrismaClient } from '@prisma/client';

interface InventoryEvent {
  eventType: string;
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  change: number;
  reservedCheckout?: number;
  reservedShipping?: number;
  availableQuantity?: number;
  orderId?: string;
  reason?: string;
  timestamp: string;
}

export class KafkaConsumerService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async startConsumer(): Promise<void> {
    try {
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          console.log(`📥 Received message from topic: ${topic}, partition: ${partition}`);
          
          if (topic === 'outbox.inventory') {
            await this.handleInventoryEvent(message);
          } else {
            console.log(`⏭️ Ignoring message from topic: ${topic}`);
            return;
          }
        },
      });

      console.log('✅ Kafka consumer started successfully');
    } catch (error) {
      console.error('❌ Error starting Kafka consumer:', error);
      throw error;
    }
  }

  private async handleInventoryEvent(message: any): Promise<void> {
    try {
      console.log('📝 Raw inventory message:', message.value?.toString());
      
      // Parse Debezium message format
      const debeziumMessage = JSON.parse(message.value?.toString() || '{}');
      console.log('📦 Debezium message parsed:', JSON.stringify(debeziumMessage, null, 2));
      
      // Extract the actual inventory event from payload
      const inventoryEvent: InventoryEvent = JSON.parse(debeziumMessage.payload || '{}');
      console.log('📊 Inventory event extracted:', JSON.stringify(inventoryEvent, null, 2));
      
      if (!inventoryEvent.productId) {
        console.log('⚠️ No productId in inventory event, skipping');
        return;
      }

      console.log(`🔄 Processing inventory update for product ${inventoryEvent.productId}`);
      console.log(`   Reason: ${inventoryEvent.reason}`);
      console.log(`   New available quantity: ${inventoryEvent.newQuantity}`);
      
      await this.updateProductStock(inventoryEvent);
      
      console.log(`✅ Successfully updated stock for product ${inventoryEvent.productId}`);
    } catch (error) {
      console.error('❌ Error processing inventory Kafka message:', error);
      console.error('Message value:', message.value?.toString());
    }
  }

  private async updateProductStock(event: InventoryEvent): Promise<void> {
    try {
      // Update the product stock with the new available quantity from inventory
      // event.newQuantity is the available quantity (total - reserved)
      const updatedProduct = await this.prisma.products.update({
        where: { 
          id: parseInt(event.productId) 
        },
        data: { 
          stock: event.newQuantity,
          updated_at: new Date()
        },
      });

      console.log(`📦 Updated product ${event.productId} stock: ${updatedProduct.stock}`);
    } catch (error) {
      console.error(`❌ Error updating product ${event.productId} stock:`, error);
      throw error;
    }
  }

  async stopConsumer(): Promise<void> {
    try {
      await consumer.stop();
      console.log('🛑 Kafka consumer stopped');
    } catch (error) {
      console.error('❌ Error stopping Kafka consumer:', error);
    }
  }
}
