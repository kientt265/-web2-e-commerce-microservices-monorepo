import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';

const router = Router();
const inventoryController = new InventoryController();

// Health check
router.get('/health', (_req, res) => res.status(200).json({ ok: true, service: 'inventory-service' }));

// Inventory routes
router.get('/inventories', inventoryController.getAllInventory);
router.post('/inventories', inventoryController.createInventory);
router.get('/inventories/product/:productId', inventoryController.getInventoryByProductId);
router.get('/inventories/low-stock', inventoryController.getLowStockItems);
router.get('/inventories/:inventoryId', inventoryController.getInventoryById);
router.put('/inventories/:inventoryId', inventoryController.updateInventory);
router.delete('/inventories/:inventoryId', inventoryController.deleteInventory);

// Transaction routes
router.get('/inventories/transactions', inventoryController.getInventoryTransactions);
router.get('/inventories/transactions/payment-method/:paymentMethod', inventoryController.getTransactionsByPaymentMethod);
router.get('/inventories/transactions/payment-status/:paymentStatus', inventoryController.getTransactionsByPaymentStatus);
router.put('/inventories/transactions/:transactionId/status', inventoryController.updateTransactionStatus);

// Redis stock routes (for order service integration)
router.post('/inventories/product/:productId/reserve', inventoryController.checkAndReserveStock);
router.post('/inventories/product/:productId/release', inventoryController.releaseReservedStock);

export default router;