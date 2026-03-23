import { PrismaClient } from '@prisma/client';
import { ORDER_EVENTS, DELIVERY_EVENTS } from '../constants/orderEvents';
import { OrderEvent, DeliveryEvent, InventoryTransaction } from '../types/inventory';
//TODO: Chưa check lại quantity available -> lỗi -> saga pattern
//TODO: Chưa handle việc quá 15p EXPIRED transaction
//TODO: Nhận message từ payment để update status payment_status
//TODO: Chưa gửi update quantity cho product-service
export class InventoryService {
  constructor(private prisma: PrismaClient) {}

  async processOrderEvent(orderEvent: OrderEvent): Promise<void> {
    try {
      console.log(`🔄 Processing order event: ${orderEvent.eventType} for order ${orderEvent.orderId}`);
      console.log(`📦 Items to process: ${orderEvent.items?.length || 0}`);

      // Process each item in order
      for (const item of orderEvent.items) {
        console.log(`🔄 Processing item: Product ${item.productId}, Quantity ${item.quantity}`);
        await this.processOrderItem(orderEvent, item);
        console.log(`✅ Processed item ${item.productId} successfully`);
      }

      console.log(`🎉 Successfully processed order event: ${orderEvent.eventType} for order ${orderEvent.orderId}`);
    } catch (error) {
      console.error(`❌ Error processing order event ${orderEvent.eventType} for order ${orderEvent.orderId}:`, error);
      throw error;
    }
  }

  async processDeliveryEvent(deliveryEvent: DeliveryEvent): Promise<void> {
    try {
      console.log(`🚚 Processing delivery event: ${deliveryEvent.eventType} for order ${deliveryEvent.orderId}`);
      console.log(`📦 Product: ${deliveryEvent.productId}, Quantity: ${deliveryEvent.quantity}`);

      // Find inventory for this product
      const inventory = await this.findInventoryByProductId(deliveryEvent.productId);
      
      if (!inventory) {
        console.error(`❌ No inventory found for product ${deliveryEvent.productId}`);
        return;
      }

      console.log(`✅ Found inventory for product ${deliveryEvent.productId}, ID: ${inventory.id}`);
      console.log(`📊 Current inventory - Total: ${inventory.quantity}, Reserved Shipping: ${inventory.reserved_shipping}`);

      if (deliveryEvent.eventType === DELIVERY_EVENTS.DELIVERY_DELIVERED) {
        // Giao thành công: trừ cả reserved_shipping và tổng quantity
        console.log(`✅ Delivery successful - Reducing reserved_shipping and total quantity`);
        
        await this.prisma.inventories.update({
          where: { id: inventory.id },
          data: {
            reserved_shipping: { decrement: deliveryEvent.quantity },
            quantity: { decrement: deliveryEvent.quantity },
            updated_at: new Date()
          }
        });
        
        console.log(`✅ Updated inventory - Reserved shipping: ${inventory.reserved_shipping - deliveryEvent.quantity}, Total quantity: ${inventory.quantity - deliveryEvent.quantity}`);
        
      } else if (deliveryEvent.eventType === DELIVERY_EVENTS.DELIVERY_FAILED) {
        // Giao thất bại: chỉ trừ reserved_shipping
        console.log(`❌ Delivery failed - Only reducing reserved_shipping`);
        
        await this.prisma.inventories.update({
          where: { id: inventory.id },
          data: {
            reserved_shipping: { decrement: deliveryEvent.quantity },
            updated_at: new Date()
          }
        });
        
        console.log(`✅ Updated inventory - Reserved shipping: ${inventory.reserved_shipping - deliveryEvent.quantity}, Total quantity unchanged: ${inventory.quantity}`);
      }

      console.log(`🎉 Successfully processed delivery event: ${deliveryEvent.eventType} for order ${deliveryEvent.orderId}`);
    } catch (error) {
      console.error(`❌ Error processing delivery event ${deliveryEvent.eventType} for order ${deliveryEvent.orderId}:`, error);
      throw error;
    }
  }

  private async processOrderItem(orderEvent: OrderEvent, item: { productId: string; quantity: number; price: number }): Promise<void> {
    console.log(`🔍 Looking for inventory for product: ${item.productId}`);
    
    // Find or create inventory record for this product
    let inventory = await this.findInventoryByProductId(item.productId);
    
    if (!inventory) {
      console.log(`⚠️ No inventory found for product ${item.productId}, creating new record`);
      inventory = await this.createInventoryRecord(item.productId);
      console.log(`✅ Created new inventory record for product ${item.productId}, ID: ${inventory.id}`);
    } else {
      console.log(`✅ Found inventory for product ${item.productId}, ID: ${inventory.id}, Available: ${inventory.quantity}`);
    }

    // Determine which reservation field to update based on payment method
    const reservationField = orderEvent.paymentMethod === 'CASH_ON_DELIVERY' ? 'reserved_shipping' : 'reserved_checkout';
    console.log(`📋 Reserving ${item.quantity} units in ${reservationField} for ${orderEvent.paymentMethod}`);
    
    await this.updateInventoryReservation(inventory.id, reservationField, item.quantity);
    console.log(`✅ Reserved ${item.quantity} units successfully`);

    // Create inventory transaction record with data from order event
    console.log(`💳 Creating transaction record for order ${orderEvent.orderId}`);
    await this.createInventoryTransaction(
      inventory.id,
      orderEvent.orderId,
      item.quantity,
      orderEvent.paymentMethod,
      'PENDING' // Initial status when order is created
    );

    console.log(`💰 Transaction created successfully - Item ${item.productId}: reserved ${item.quantity} units for ${reservationField}`);
  }

  private async findInventoryByProductId(productId: string): Promise<any> {
    // Find inventory by product_id field
    return await this.prisma.inventories.findFirst({
      where: { product_id: productId },
    });
  }

  private async createInventoryRecord(productId: string): Promise<any> {
    // Create inventory record with product_id from order event
    return await this.prisma.inventories.create({
      data: {
        product_id: productId, // Use productId from order event
        quantity: 100, // Default quantity
        reserved_checkout: 0,
        reserved_shipping: 0,
        min_threshold: 5,
        location: `Warehouse-${productId}`,
      },
    });
  }

  private async updateInventoryReservation(inventoryId: number, field: 'reserved_checkout' | 'reserved_shipping', quantity: number): Promise<void> {
    await this.prisma.inventories.update({
      where: { id: inventoryId },
      data: {
        [field]: { increment: quantity },
        updated_at: new Date()
      },
    });
  }

  private async createInventoryTransaction(
    inventoryId: number,
    orderId: string,
    quantity: number,
    paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY',
    paymentStatus: 'PENDING' | 'PAID' | 'EXPIRED'
  ): Promise<void> {
    await this.prisma.inventory_transactions.create({
      data: {
        inventory_id: inventoryId,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        quantity,
        order_id: orderId,
      },
    });
  }

  // Standard inventory management methods
  async getInventoryById(inventoryId: number): Promise<any> {
    return await this.prisma.inventories.findUnique({
      where: { id: inventoryId },
      include: {
        transactions: {
          orderBy: { created_at: 'desc' },
          take: 10, // Last 10 transactions
        },
      },
    });
  }

  async getAllInventory(): Promise<any[]> {
    return await this.prisma.inventories.findMany({
      include: {
        transactions: {
          orderBy: { created_at: 'desc' },
          take: 5, // Last 5 transactions per inventory
        },
      },
    });
  }

  async updateInventory(inventoryId: number, updateData: any): Promise<any> {
    return await this.prisma.inventories.update({
      where: { id: inventoryId },
      data: updateData,
    });
  }

  async createInventory(data: any): Promise<any> {
    return await this.prisma.inventories.create({
      data,
    });
  }

  async deleteInventory(inventoryId: number): Promise<void> {
    await this.prisma.inventories.delete({
      where: { id: inventoryId },
    });
  }

  async getInventoryTransactions(orderId?: string): Promise<InventoryTransaction[]> {
    const whereClause = orderId ? { order_id: orderId } : {};
    
    return await this.prisma.inventory_transactions.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      include: {
        inventory: true,
      },
    });
  }

  async updateTransactionStatus(transactionId: number, status: 'PENDING' | 'PAID' | 'EXPIRED'): Promise<any> {
    return await this.prisma.inventory_transactions.update({
      where: { id: transactionId },
      data: { payment_status: status },
    });
  }

  async getLowStockItems(): Promise<any[]> {
    return await this.prisma.inventories.findMany({
      where: {
        quantity: {
          lte: this.prisma.inventories.fields.min_threshold,
        },
      },
    });
  }

  async getTransactionsByPaymentMethod(paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY'): Promise<InventoryTransaction[]> {
    return await this.prisma.inventory_transactions.findMany({
      where: { payment_method: paymentMethod },
      orderBy: { created_at: 'desc' },
      include: { inventory: true },
    });
  }

  async getTransactionsByPaymentStatus(paymentStatus: 'PENDING' | 'PAID' | 'EXPIRED'): Promise<InventoryTransaction[]> {
    return await this.prisma.inventory_transactions.findMany({
      where: { payment_status: paymentStatus },
      orderBy: { created_at: 'desc' },
      include: { inventory: true },
    });
  }
}
