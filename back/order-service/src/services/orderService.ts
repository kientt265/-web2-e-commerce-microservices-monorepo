// import { producer } from '../config/kafka';
import { ORDER_EVENTS } from '../constants/orderEvents';
import { CreateOrderRequest, OrderEvent, OrderResponse } from '../types/order';
import { OutboxService } from './outboxService';

export class OrderService {
  private outboxService = new OutboxService();

  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  async publishOrderEvent(orderData: CreateOrderRequest): Promise<void> {
    const orderId = this.generateOrderId();
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
    const now = new Date().toISOString();

    // TODO: Save order to database
    // For now, we'll create the response object directly
    
    const orderResponse: OrderResponse = {
      orderId,
      userId: orderData.userId,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      status: 'PENDING',
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentMethod === 'CASH_ON_DELIVERY' ? 'PENDING' : 'PENDING',
      shippingAddress: orderData.shippingAddress,
      createdAt: now,
      updatedAt: now,
      paymentUrl: undefined, // TODO: Implement payment URL generation for online payment
    };

    // Publish order event to Kafka
    await this.publishOrderEvent(orderData);

    return orderResponse;
  }

  // TODO: Implement payment URL generation
  private generatePaymentUrl(orderId: string, totalAmount: number): string {
    // This is a placeholder for payment URL generation
    // You'll implement this later with actual payment gateway integration
    return `https://payment.example.com/pay?orderId=${orderId}&amount=${totalAmount}`;
  }

  async getOrderById(orderId: string): Promise<OrderResponse | null> {
    // TODO: Implement database query to get order by ID
    // For now, return null as placeholder
    console.log(`Getting order by ID: ${orderId}`);
    return null;
  }

  async getOrdersByUserId(userId: string): Promise<OrderResponse[]> {
    // TODO: Implement database query to get orders by user ID
    // For now, return empty array as placeholder
    console.log(`Getting orders for user: ${userId}`);
    return [];
  }
}
