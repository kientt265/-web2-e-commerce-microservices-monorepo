import { Router } from 'express';
import {
  getAllDeliveries,
  getDeliveryById,
  createDelivery,
  updateDelivery,
  deleteDelivery,
  getDeliveriesByOrderId,
  updateDeliveryStatus,
} from '../controllers/deliveryController';

const router = Router();

router.get('/health', (_req, res) => res.status(200).json({ ok: true, service: 'delivery-service' }));

// Delivery CRUD operations
router.get('/deliveries', getAllDeliveries);
router.get('/deliveries/:id', getDeliveryById);
router.post('/deliveries', createDelivery);
router.put('/deliveries/:id', updateDelivery);
router.delete('/deliveries/:id', deleteDelivery);

// Additional delivery endpoints
router.get('/orders/:orderId/deliveries', getDeliveriesByOrderId);
router.patch('/deliveries/:id/status', updateDeliveryStatus);

export default router;
