import { Request, Response } from 'express';
import { OrderService } from '../services/orderService';
import { CreateOrderRequest } from '../types/order';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  createOrder = async (req: Request, res: Response) => {
    try {
      const orderData: CreateOrderRequest = req.body;

      // Basic validation
      if (!orderData.userId || !orderData.items || !orderData.shippingAddress || !orderData.paymentMethod) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'userId, items, shippingAddress, and paymentMethod are required',
        });
      }

      if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
        return res.status(400).json({
          error: 'Invalid items',
          message: 'Items must be a non-empty array',
        });
      }

      if (!['ONLINE_PAYMENT', 'CASH_ON_DELIVERY'].includes(orderData.paymentMethod)) {
        return res.status(400).json({
          error: 'Invalid payment method',
          message: 'Payment method must be either ONLINE_PAYMENT or CASH_ON_DELIVERY',
        });
      }

      const order = await this.orderService.createOrder(orderData);

      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully',
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create order',
      });
    }
  };

  getOrderById = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          error: 'Missing order ID',
          message: 'Order ID is required',
        });
      }

      const order = await this.orderService.getOrderById(orderId);

      if (!order) {
        return res.status(404).json({
          error: 'Order not found',
          message: `Order with ID ${orderId} not found`,
        });
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Error getting order:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get order',
      });
    }
  };

  getOrdersByUserId = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          error: 'Missing user ID',
          message: 'User ID is required',
        });
      }

      const orders = await this.orderService.getOrdersByUserId(userId);

      res.status(200).json({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      console.error('Error getting orders by user ID:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get orders',
      });
    }
  };
}
