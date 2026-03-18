import { Request, Response } from 'express';
import { InventoryService } from '../services/inventoryService';
import { PrismaClient } from '@prisma/client';

export class InventoryController {
  private inventoryService: InventoryService;

  constructor() {
    const prisma = new PrismaClient();
    this.inventoryService = new InventoryService(prisma);
  }

  // Get all inventory items
  getAllInventory = async (req: Request, res: Response) => {
    try {
      const inventory = await this.inventoryService.getAllInventory();
      
      res.status(200).json({
        success: true,
        data: inventory,
        count: inventory.length,
      });
    } catch (error) {
      console.error('Error getting all inventory:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get inventory',
      });
    }
  };

  // Get inventory by ID
  getInventoryById = async (req: Request, res: Response) => {
    try {
      const { inventoryId } = req.params;

      if (!inventoryId || isNaN(Number(inventoryId))) {
        return res.status(400).json({
          error: 'Invalid inventory ID',
          message: 'Inventory ID must be a valid number',
        });
      }

      const inventory = await this.inventoryService.getInventoryById(Number(inventoryId));

      if (!inventory) {
        return res.status(404).json({
          error: 'Inventory not found',
          message: `Inventory with ID ${inventoryId} not found`,
        });
      }

      res.status(200).json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      console.error('Error getting inventory by ID:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get inventory',
      });
    }
  };

  // Create new inventory
  createInventory = async (req: Request, res: Response) => {
    try {
      const inventoryData = req.body;

      if (!inventoryData.quantity || inventoryData.quantity < 0) {
        return res.status(400).json({
          error: 'Invalid quantity',
          message: 'Quantity must be a non-negative number',
        });
      }

      const inventory = await this.inventoryService.createInventory(inventoryData);

      res.status(201).json({
        success: true,
        data: inventory,
        message: 'Inventory created successfully',
      });
    } catch (error) {
      console.error('Error creating inventory:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create inventory',
      });
    }
  };

  // Update inventory
  updateInventory = async (req: Request, res: Response) => {
    try {
      const { inventoryId } = req.params;
      const updateData = req.body;

      if (!inventoryId || isNaN(Number(inventoryId))) {
        return res.status(400).json({
          error: 'Invalid inventory ID',
          message: 'Inventory ID must be a valid number',
        });
      }

      // Validate update data
      if (updateData.quantity !== undefined && updateData.quantity < 0) {
        return res.status(400).json({
          error: 'Invalid quantity',
          message: 'Quantity must be a non-negative number',
        });
      }

      if (updateData.reserved_checkout !== undefined && updateData.reserved_checkout < 0) {
        return res.status(400).json({
          error: 'Invalid reserved checkout',
          message: 'Reserved checkout must be a non-negative number',
        });
      }

      if (updateData.reserved_shipping !== undefined && updateData.reserved_shipping < 0) {
        return res.status(400).json({
          error: 'Invalid reserved shipping',
          message: 'Reserved shipping must be a non-negative number',
        });
      }

      const inventory = await this.inventoryService.updateInventory(Number(inventoryId), updateData);

      res.status(200).json({
        success: true,
        data: inventory,
        message: 'Inventory updated successfully',
      });
    } catch (error) {
      console.error('Error updating inventory:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update inventory',
      });
    }
  };

  // Delete inventory
  deleteInventory = async (req: Request, res: Response) => {
    try {
      const { inventoryId } = req.params;

      if (!inventoryId || isNaN(Number(inventoryId))) {
        return res.status(400).json({
          error: 'Invalid inventory ID',
          message: 'Inventory ID must be a valid number',
        });
      }

      await this.inventoryService.deleteInventory(Number(inventoryId));

      res.status(200).json({
        success: true,
        message: 'Inventory deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting inventory:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete inventory',
      });
    }
  };

  // Get inventory transactions
  getInventoryTransactions = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.query;

      const transactions = await this.inventoryService.getInventoryTransactions(
        orderId as string
      );

      res.status(200).json({
        success: true,
        data: transactions,
        count: transactions.length,
      });
    } catch (error) {
      console.error('Error getting inventory transactions:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get inventory transactions',
      });
    }
  };

  // Get transactions by payment method
  getTransactionsByPaymentMethod = async (req: Request, res: Response) => {
    try {
      const { paymentMethod } = req.params;

      if (!paymentMethod || !['ONLINE_PAYMENT', 'CASH_ON_DELIVERY'].includes(paymentMethod)) {
        return res.status(400).json({
          error: 'Invalid payment method',
          message: 'Payment method must be ONLINE_PAYMENT or CASH_ON_DELIVERY',
        });
      }

      const transactions = await this.inventoryService.getTransactionsByPaymentMethod(
        paymentMethod as 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY'
      );

      res.status(200).json({
        success: true,
        data: transactions,
        count: transactions.length,
      });
    } catch (error) {
      console.error('Error getting transactions by payment method:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get transactions by payment method',
      });
    }
  };

  // Get transactions by payment status
  getTransactionsByPaymentStatus = async (req: Request, res: Response) => {
    try {
      const { paymentStatus } = req.params;

      if (!paymentStatus || !['PENDING', 'PAID', 'EXPIRED'].includes(paymentStatus)) {
        return res.status(400).json({
          error: 'Invalid payment status',
          message: 'Payment status must be PENDING, PAID, or EXPIRED',
        });
      }

      const transactions = await this.inventoryService.getTransactionsByPaymentStatus(
        paymentStatus as 'PENDING' | 'PAID' | 'EXPIRED'
      );

      res.status(200).json({
        success: true,
        data: transactions,
        count: transactions.length,
      });
    } catch (error) {
      console.error('Error getting transactions by payment status:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get transactions by payment status',
      });
    }
  };

  // Update transaction status
  updateTransactionStatus = async (req: Request, res: Response) => {
    try {
      const { transactionId } = req.params;
      const { paymentStatus } = req.body;

      if (!transactionId || isNaN(Number(transactionId))) {
        return res.status(400).json({
          error: 'Invalid transaction ID',
          message: 'Transaction ID must be a valid number',
        });
      }

      if (!paymentStatus || !['PENDING', 'PAID', 'EXPIRED'].includes(paymentStatus)) {
        return res.status(400).json({
          error: 'Invalid payment status',
          message: 'Payment status must be PENDING, PAID, or EXPIRED',
        });
      }

      const transaction = await this.inventoryService.updateTransactionStatus(
        Number(transactionId),
        paymentStatus as 'PENDING' | 'PAID' | 'EXPIRED'
      );

      res.status(200).json({
        success: true,
        data: transaction,
        message: 'Transaction status updated successfully',
      });
    } catch (error) {
      console.error('Error updating transaction status:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update transaction status',
      });
    }
  };

  // Get low stock items
  getLowStockItems = async (req: Request, res: Response) => {
    try {
      const lowStockItems = await this.inventoryService.getLowStockItems();

      res.status(200).json({
        success: true,
        data: lowStockItems,
        count: lowStockItems.length,
        message: 'Low stock items retrieved successfully',
      });
    } catch (error) {
      console.error('Error getting low stock items:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get low stock items',
      });
    }
  };
}