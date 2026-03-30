import { PrismaClient } from '@prisma/client';
import { ORDER_EVENTS, DELIVERY_EVENTS, PAYMENT_EVENTS } from '../constants/orderEvents';
import { OrderEvent, DeliveryEvent, PaymentEvent, InventoryTransaction } from '../types/inventory';
import { saveInventoryQuantityOutbox, saveInventoryCreatedOutbox, INVENTORY_OUTBOX_EVENT } from './outboxService';
import redis from '../config/redis/redis';
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

  async processPaymentEvent(paymentEvent: PaymentEvent): Promise<void> {
    try {
      console.log(`💳 Processing payment event: ${paymentEvent.event_type} for order ${paymentEvent.orderId}`);
      console.log(`📝 Payment status: ${paymentEvent.status}, Payment method: ${paymentEvent.paymentMethod}`);

      // Only process completed payments for online payment
      if (paymentEvent.event_type !== PAYMENT_EVENTS.PAYMENT_COMPLETED || 
          paymentEvent.status !== 'COMPLETED' ||
          paymentEvent.paymentMethod !== 'ONLINE_PAYMENT') {
        console.log(`⏭️ Ignoring payment event - not a completed online payment`);
        return;
      }

      // Find all inventory transactions for this order with PENDING status and ONLINE_PAYMENT method
      const pendingTransactions = await this.prisma.inventory_transactions.findMany({
        where: {
          order_id: paymentEvent.orderId,
          payment_method: 'ONLINE_PAYMENT',
          payment_status: 'PENDING'
        },
        include: {
          inventory: true
        }
      });

      if (pendingTransactions.length === 0) {
        console.log(`⚠️ No pending transactions found for order ${paymentEvent.orderId}`);
        return;
      }

      console.log(`📦 Found ${pendingTransactions.length} pending transactions to update`);

      // Process each transaction
      for (const transaction of pendingTransactions) {
        console.log(`🔄 Updating transaction ${transaction.id} for product ${transaction.inventory.product_id}`);
        
        // Update transaction status to PAID
        await this.prisma.inventory_transactions.update({
          where: { id: transaction.id },
          data: { payment_status: 'PAID' }
        });

        // Update inventory: move from reserved_checkout to reserved_shipping
        await this.prisma.inventories.update({
          where: { id: transaction.inventory.id },
          data: {
            reserved_checkout: { decrement: transaction.quantity },
            reserved_shipping: { increment: transaction.quantity },
            updated_at: new Date()
          }
        });

        console.log(`✅ Updated inventory for product ${transaction.inventory.product_id}:`);
        console.log(`   - Moved ${transaction.quantity} units from reserved_checkout to reserved_shipping`);
        console.log(`   - Transaction ${transaction.id} status updated to PAID`);
      }

      console.log(`🎉 Successfully processed payment event for order ${paymentEvent.orderId}`);
    } catch (error) {
      console.error(`❌ Error processing payment event for order ${paymentEvent.orderId}:`, error);
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
        // Giao thành công: chỉ giảm reserved_shipping, quantity đã được trừ khi đặt trước
        console.log(`✅ Delivery successful - Reducing reserved_shipping only`);
        
        await this.prisma.$transaction(async (tx: PrismaClient) => {
          // Update inventory - chỉ giảm reserved_shipping
          await tx.inventories.update({
            where: { id: inventory.id },
            data: {
              reserved_shipping: { decrement: deliveryEvent.quantity },
              updated_at: new Date()
            }
          });
          
          // Save to outbox for product-service
          await saveInventoryQuantityOutbox(tx, {
            inventoryId: inventory.id,
            productId: deliveryEvent.productId,
            eventType: 'QUANTITY_UPDATED',
            quantityChange: {
              previousQuantity: inventory.quantity,
              newQuantity: inventory.quantity,
              change: 0
            },
            reservedCheckout: inventory.reserved_checkout,
            reservedShipping: inventory.reserved_shipping - deliveryEvent.quantity,
            orderId: deliveryEvent.orderId,
            reason: 'DELIVERY_DELIVERED'
          });
        });
        
        console.log(`✅ Updated inventory - Reserved shipping: ${inventory.reserved_shipping - deliveryEvent.quantity}, Available quantity unchanged: ${inventory.quantity}`);
        console.log(`📤 Saved quantity change to outbox for product-service`);
        
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
    
    // Process reservation and create transaction in a single transaction with outbox
    await this.reserveInventoryWithOutbox(
      inventory,
      reservationField,
      item.quantity,
      orderEvent.orderId,
      orderEvent.paymentMethod
    );
    
    console.log(`✅ Reserved ${item.quantity} units successfully with outbox event`);
  }

  private async findInventoryByProductId(productId: string): Promise<any> {
    // Find inventory by product_id field
    return await this.prisma.inventories.findFirst({
      where: { product_id: productId },
    });
  }

  private async createInventoryRecord(productId: string): Promise<any> {
    // Create inventory record with product_id from order event
    const location = `Warehouse-${productId}`;
    const initialQuantity = 100;
    const minThreshold = 5;
    
    return await this.prisma.$transaction(async (tx: PrismaClient) => {
      const inventory = await tx.inventories.create({
        data: {
          product_id: productId,
          quantity: initialQuantity,
          reserved_checkout: 0,
          reserved_shipping: 0,
          min_threshold: minThreshold,
          location,
        },
      });
      
      // Save to outbox for product-service
      await saveInventoryCreatedOutbox(tx, {
        inventoryId: inventory.id,
        productId,
        initialQuantity,
        minThreshold,
        location
      });
      
      console.log(`📤 Saved new inventory creation to outbox for product-service`);
      
      return inventory;
    });
  }

  private async reserveInventoryWithOutbox(
    inventory: any,
    field: 'reserved_checkout' | 'reserved_shipping',
    quantity: number,
    orderId: string,
    paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY'
  ): Promise<void> {
    const previousQuantity = inventory.quantity;
    const previousReserved = field === 'reserved_checkout' ? inventory.reserved_checkout : inventory.reserved_shipping;
    
    await this.prisma.$transaction(async (tx: PrismaClient) => {
      // Update inventory - decrease available quantity, increase reserved
      await tx.inventories.update({
        where: { id: inventory.id },
        data: {
          [field]: { increment: quantity },
          quantity: { decrement: quantity },
          updated_at: new Date()
        },
      });
      
      // Create inventory transaction record
      await tx.inventory_transactions.create({
        data: {
          inventory_id: inventory.id,
          payment_method: paymentMethod,
          payment_status: 'PENDING',
          quantity,
          order_id: orderId,
        },
      });
      
      // Save to outbox for product-service
      const newQuantity = previousQuantity - quantity;
      const newReserved = previousReserved + quantity;
      
      await saveInventoryQuantityOutbox(tx, {
        inventoryId: inventory.id,
        productId: inventory.product_id,
        eventType: 'QUANTITY_UPDATED',
        quantityChange: {
          previousQuantity,
          newQuantity,
          change: -quantity
        },
        reservedCheckout: field === 'reserved_checkout' ? newReserved : inventory.reserved_checkout,
        reservedShipping: field === 'reserved_shipping' ? newReserved : inventory.reserved_shipping,
        orderId,
        reason: `ORDER_RESERVED_${field.toUpperCase()}`
      });
      
      console.log(`📤 Saved reservation to outbox: ${previousQuantity} → ${newQuantity} available, ${newReserved} reserved`);
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

  async getInventoryByProductId(productId: string): Promise<any> {
    const inventory = await this.prisma.inventories.findFirst({
      where: { product_id: productId },
      include: {
        transactions: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });
    return inventory;
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
    console.log(`🔄 updateInventory called for ID ${inventoryId}`, updateData);
    
    // If quantity is being updated, use transaction to save outbox
    if (updateData.quantity !== undefined) {
      console.log(`📝 Quantity update detected: ${updateData.quantity}`);
      
      const existingInventory = await this.prisma.inventories.findUnique({
        where: { id: inventoryId }
      });
      
      if (!existingInventory) {
        throw new Error(`Inventory ${inventoryId} not found`);
      }
      
      const previousQuantity = existingInventory.quantity;
      const newQuantity = updateData.quantity;
      const change = newQuantity - previousQuantity;
      
      console.log(`📊 Quantity change: ${previousQuantity} → ${newQuantity} (change: ${change})`);
      
      try {
        return await this.prisma.$transaction(async (tx: PrismaClient) => {
          const inventory = await tx.inventories.update({
            where: { id: inventoryId },
            data: updateData,
          });
          
          console.log(`✅ Inventory updated in DB, now saving to outbox...`);
          
          // Save to outbox for product-service
          await saveInventoryQuantityOutbox(tx, {
            inventoryId,
            productId: existingInventory.product_id,
            eventType: 'QUANTITY_UPDATED',
            quantityChange: {
              previousQuantity,
              newQuantity,
              change
            },
            reservedCheckout: inventory.reserved_checkout,
            reservedShipping: inventory.reserved_shipping,
            reason: 'ADMIN_UPDATE'
          });
          
          console.log(`📤 Saved quantity update to outbox for product-service`);
          
          return inventory;
        });
      } catch (error) {
        console.error(`❌ Error in updateInventory transaction:`, error);
        throw error;
      }
    }
    
    // If no quantity change, just update normally
    console.log(`📝 No quantity change, updating inventory directly`);
    return await this.prisma.inventories.update({
      where: { id: inventoryId },
      data: updateData,
    });
  }

  async createInventory(data: any): Promise<any> {
    // If creating with quantity, use transaction to save outbox
    if (data.quantity !== undefined && data.product_id) {
      const initialQuantity = data.quantity;
      const minThreshold = data.min_threshold ?? 5;
      const location = data.location ?? `Warehouse-${data.product_id}`;
      
      return await this.prisma.$transaction(async (tx: PrismaClient) => {
        const inventory = await tx.inventories.create({
          data: {
            ...data,
            reserved_checkout: data.reserved_checkout ?? 0,
            reserved_shipping: data.reserved_shipping ?? 0,
            min_threshold: minThreshold,
            location
          },
        });
        
        // Save to outbox for product-service
        await saveInventoryCreatedOutbox(tx, {
          inventoryId: inventory.id,
          productId: data.product_id,
          initialQuantity,
          minThreshold,
          location
        });
        
        console.log(`📤 Saved new inventory creation to outbox for product-service`);
        
        return inventory;
      });
    }
    
    // Otherwise create normally
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

  /**
   * Check and reserve stock using Redis cache-aside pattern
   * 1. Check if stock exists in Redis
   * 2. If not, load from DB and set to Redis
   * 3. Try to reserve stock in Redis
   * 4. Return 1 if success, -1 if not enough stock
   */
  async checkAndReserveStock(productId: string, quantity: number, orderId: string): Promise<number> {
    const redisKey = `stock:${productId}`;
    
    try {
      // 1. Check if stock exists in Redis
      let stock = await redis.get(redisKey);
      
      // 2. If not in Redis, load from DB
      if (stock === null) {
        console.log(`📦 Stock not found in Redis for product ${productId}, loading from DB...`);
        const inventory = await this.findInventoryByProductId(productId);
        
        if (!inventory) {
          console.log(`❌ No inventory found for product ${productId}`);
          return -1;
        }
        
        // Get available quantity (total - reserved)
        const availableStock = inventory.quantity;
        
        // Set to Redis with TTL (e.g., 5 minutes)
        await redis.setex(redisKey, 300, availableStock.toString());
        stock = availableStock.toString();
        console.log(`✅ Loaded stock ${availableStock} to Redis for product ${productId}`);
      }
      
      const currentStock = parseInt(stock);
      
      // 3. Reserve stock using Lua script for atomic check-and-reserve
      const result = await (redis as any).reserveStock(redisKey, quantity.toString());
      
      if (result === -1 || result === null) {
        console.log(`❌ Not enough stock or failed to reserve for product ${productId}. Available: ${currentStock}, Requested: ${quantity}`);
        return -1;
      }
      
      console.log(`✅ Reserved ${quantity} units for product ${productId}. Remaining: ${result}`);
      
      // 5. Update DB to reflect the reservation
      const inventory = await this.findInventoryByProductId(productId);
      if (inventory) {
        await this.prisma.$transaction(async (tx: PrismaClient) => {
          // Update inventory - decrease available quantity
          await tx.inventories.update({
            where: { id: inventory.id },
            data: {
              reserved_checkout: { increment: quantity },
              quantity: { decrement: quantity },
              updated_at: new Date()
            },
          });
          
          // Create inventory transaction record
          await tx.inventory_transactions.create({
            data: {
              inventory_id: inventory.id,
              payment_method: 'ONLINE_PAYMENT',
              payment_status: 'PENDING',
              quantity,
              order_id: orderId,
            },
          });
        });
        
        console.log(`✅ DB updated for product ${productId}: reserved ${quantity}, quantity decreased`);
      }
      
      return 1;
      
    } catch (error) {
      console.error(`❌ Error checking/reserving stock for product ${productId}:`, error);
      return -1;
    }
  }

  /**
   * Release reserved stock back to Redis and DB (for order cancellation/payment failure)
   */
  async releaseReservedStock(productId: string, quantity: number, orderId: string): Promise<number> {
    const redisKey = `stock:${productId}`;
    
    try {
      // 1. Increase stock in Redis
      const newStock = await redis.incrby(redisKey, quantity);
      console.log(`✅ Released ${quantity} units back to Redis for product ${productId}. New stock: ${newStock}`);
      
      // 2. Update DB to release reservation
      const inventory = await this.findInventoryByProductId(productId);
      if (inventory) {
        await this.prisma.$transaction(async (tx: PrismaClient) => {
          // Update inventory - increase available quantity, decrease reserved
          await tx.inventories.update({
            where: { id: inventory.id },
            data: {
              reserved_checkout: { decrement: quantity },
              quantity: { increment: quantity },
              updated_at: new Date()
            },
          });
          
          // Update transaction status to EXPIRED
          await tx.inventory_transactions.updateMany({
            where: {
              order_id: orderId,
              inventory_id: inventory.id,
              payment_status: 'PENDING'
            },
            data: { payment_status: 'EXPIRED' }
          });
        });
        
        console.log(`✅ DB updated for product ${productId}: released ${quantity}, quantity increased`);
      }
      
      return 1;
      
    } catch (error) {
      console.error(`❌ Error releasing stock for product ${productId}:`, error);
      return -1;
    }
  }
}

