// import { producer } from '../config/kafka';
import { ORDER_EVENTS } from '../constants/orderEvents';
import { CreateOrderRequest, OrderEvent, OrderResponse } from '../types/order';
import { OutboxService } from './outboxService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class OrderService {
  private outboxService = new OutboxService();

  private generateOrderId(): string {
  // Generate a much smaller number that fits in INT4 (max 2,147,483,647)
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const id = (timestamp % 100000) * 1000 + random; // Keep it under 100,000,000
  return `order_${id}`;
}

  private createOrderEvent(orderData: CreateOrderRequest, orderId: string): OrderEvent {
    const eventType = orderData.paymentMethod === 'ONLINE_PAYMENT' 
      ? ORDER_EVENTS.ORDER_CREATED_ONLINE_PAYMENT 
      : ORDER_EVENTS.ORDER_CREATED_CASH_ON_DELIVERY;

    return {
      eventType,
      orderId,
      userId: orderData.userId,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      shippingAddress: orderData.shippingAddress,
      paymentMethod: orderData.paymentMethod,
      timestamp: new Date().toISOString(),
    };
  }

  async publishOrderEvent(orderData: CreateOrderRequest, orderId: string): Promise<void> {
    const orderEvent = this.createOrderEvent(orderData, orderId);

    try {
      // Save to outbox table instead of publishing directly to Kafka
      await this.outboxService.saveOrderEvent(orderEvent);

      // Old Kafka publishing code (commented out):
      // const topic = 'order-events';
      // await producer.send({
      //   topic,
      //   messages: [
      //     {
      //       key: orderId,
      //       value: JSON.stringify(orderEvent),
      //       headers: {
      //         eventType: orderEvent.eventType,
      //         timestamp: orderEvent.timestamp,
      //       },
      //     },
      //   ],
      // });

      console.log(`Order event saved to outbox: ${orderEvent.eventType} for order ${orderId}`);
    } catch (error) {
      console.error('Error saving order event to outbox:', error);
      throw new Error('Failed to save order event to outbox');
    }
  }

  async createOrder(orderData: CreateOrderRequest): Promise<OrderResponse> {
    const orderId = this.generateOrderId();
    const now = new Date();

    try {
      // Save order to database using Prisma
      const order = await prisma.orders.create({
        data: {
          id: orderId,
          user_id: orderData.userId,
          status: 'pending',
          payment_method: orderData.paymentMethod === 'ONLINE_PAYMENT' ? 'ONLINE' : 'COD',
          total_amount: orderData.totalAmount,
          shipping_address: JSON.stringify(orderData.shippingAddress),
          created_at: now,
          updated_at: now,
        },
      });

      // Save order items
      for (const item of orderData.items) {
        await prisma.order_items.create({
          data: {
            order_id: order.id,
            product_id: parseInt(item.productId.replace('product_', '')), // Extract numeric ID
            quantity: item.quantity,
            price_at_time: item.price,
            created_at: now,
          },
        });
      }

      console.log(`✅ Order saved to database: ${orderId}`);

      // Publish order event to Kafka (outbox pattern)
      await this.publishOrderEvent(orderData, orderId);

      // Generate payment URL for online payment
      let paymentUrl: string | undefined;
      if (orderData.paymentMethod === 'ONLINE_PAYMENT') {
        paymentUrl = await this.generatePaymentUrl(orderId, orderData.totalAmount);
      }

      const orderResponse: OrderResponse = {
        orderId,
        userId: orderData.userId,
        items: orderData.items,
        totalAmount: orderData.totalAmount,
        status: 'PENDING',
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentMethod === 'CASH_ON_DELIVERY' ? 'PENDING' : 'PENDING',
        deliveryStatus: order.delivery_status as any,
        shippingAddress: orderData.shippingAddress,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        paymentUrl,
      };

      return orderResponse;
    } catch (error) {
      console.error('❌ Error creating order in database:', error);
      throw new Error('Failed to create order');
    }
  }

  private async generatePaymentUrl(orderId: string, totalAmount: number): Promise<string> {
    try {
      const { VNPayService } = await import('./vnpayService');
      const vnpayService = new VNPayService();
      
      const paymentUrl = vnpayService.createPaymentUrl({
        orderId,
        amount: totalAmount,
        orderInfo: `Thanh toan don hang ${orderId}`,
        ipAddress: '127.0.0.1', // TODO: Get real IP from request
      });
      
      console.log(`✅ Payment URL generated for order ${orderId}: ${paymentUrl}`);
      return paymentUrl;
    } catch (error) {
      console.error('❌ Error generating payment URL:', error);
      throw new Error('Failed to generate payment URL');
    }
  }

  async getOrderById(orderId: string): Promise<OrderResponse | null> {
    try {
      const order = await prisma.orders.findFirst({
        where: {
          id: orderId
        },
        include: {
          order_items: true
        }
      });

      if (!order) {
        return null;
      }

      const orderResponse: OrderResponse = {
        orderId: order.id,
        userId: order.user_id,
        items: order.order_items.map((item: any) => ({
          productId: `product_${item.product_id}`,
          quantity: item.quantity,
          price: item.price_at_time
        })),
        totalAmount: order.total_amount,
        status: order.status.toUpperCase() as any,
        paymentMethod: order.payment_method === 'ONLINE' ? 'ONLINE_PAYMENT' : 'CASH_ON_DELIVERY',
        paymentStatus: order.payment_status as any,
        deliveryStatus: order.delivery_status as any,
        shippingAddress: JSON.parse(order.shipping_address),
        createdAt: order.created_at?.toISOString() || '',
        updatedAt: order.updated_at?.toISOString() || '',
        paymentUrl: undefined,
      };

      return orderResponse;
    } catch (error) {
      console.error('❌ Error getting order by ID:', error);
      throw new Error('Failed to get order');
    }
  }

  async getOrdersByUserId(userId: string): Promise<OrderResponse[]> {
    try {
      const orders = await prisma.orders.findMany({
        where: {
          user_id: userId
        },
        include: {
          order_items: true
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return orders.map((order: any) => ({
        orderId: order.id,
        userId: order.user_id,
        items: order.order_items.map((item: any) => ({
          productId: `product_${item.product_id}`,
          quantity: item.quantity,
          price: item.price_at_time
        })),
        totalAmount: order.total_amount,
        status: order.status.toUpperCase() as any,
        paymentMethod: order.payment_method === 'ONLINE' ? 'ONLINE_PAYMENT' : 'CASH_ON_DELIVERY',
        paymentStatus: order.payment_status as any,
        deliveryStatus: order.delivery_status as any,
        shippingAddress: JSON.parse(order.shipping_address),
        createdAt: order.created_at?.toISOString() || '',
        updatedAt: order.updated_at?.toISOString() || '',
        paymentUrl: undefined,
      }));
    } catch (error) {
      console.error('❌ Error getting orders by user ID:', error);
      throw new Error('Failed to get orders');
    }
  }
}
