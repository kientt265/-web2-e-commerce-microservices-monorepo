import type { Request, Response } from 'express';
import { deliveryService } from '../services/deliveryService';
import { DeliveryValidationError } from '../types/delivery';

export async function getAllDeliveries(req: Request, res: Response) {
  try {
    const result = await deliveryService.getAllDeliveries(req.query);
    return res.status(200).json(result);
  } catch (err) {
    console.error('getAllDeliveries error:', err);
    if (err instanceof DeliveryValidationError) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
}

export async function getDeliveryById(req: Request, res: Response) {
  try {
    const delivery = await deliveryService.getDeliveryById(req.params.id);
    return res.status(200).json(delivery);
  } catch (err) {
    console.error('getDeliveryById error:', err);
    if (err instanceof DeliveryValidationError) {
      if (err.message === 'Delivery not found') {
        return res.status(404).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to fetch delivery' });
  }
}

export async function createDelivery(req: Request, res: Response) {
  try {
    const delivery = await deliveryService.createDelivery(req.body);
    return res.status(201).json(delivery);
  } catch (err) {
    console.error('createDelivery error:', err);
    if (err instanceof DeliveryValidationError) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to create delivery' });
  }
}

export async function updateDelivery(req: Request, res: Response) {
  try {
    const delivery = await deliveryService.updateDelivery(req.params.id, req.body);
    return res.status(200).json(delivery);
  } catch (err) {
    console.error('updateDelivery error:', err);
    if (err instanceof DeliveryValidationError) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to update delivery' });
  }
}

export async function deleteDelivery(req: Request, res: Response) {
  try {
    await deliveryService.deleteDelivery(req.params.id);
    return res.status(204).send();
  } catch (err) {
    console.error('deleteDelivery error:', err);
    if (err instanceof DeliveryValidationError) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to delete delivery' });
  }
}

export async function getDeliveriesByUserId(req: Request, res: Response) {
  try {
    const deliveries = await deliveryService.getDeliveriesByUserId(req.params.userId);
    return res.status(200).json(deliveries);
  } catch (err) {
    console.error('getDeliveriesByUserId error:', err);
    if (err instanceof DeliveryValidationError) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to fetch deliveries for user' });
  }
}

export async function getDeliveriesByOrderId(req: Request, res: Response) {
  try {
    const deliveries = await deliveryService.getDeliveriesByOrderId(req.params.orderId);
    return res.status(200).json(deliveries);
  } catch (err) {
    console.error('getDeliveriesByOrderId error:', err);
    if (err instanceof DeliveryValidationError) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to fetch deliveries for order' });
  }
}

export async function updateDeliveryStatus(req: Request, res: Response) {
  try {
    const delivery = await deliveryService.updateDeliveryStatus(req.params.id, req.body);
    return res.status(200).json(delivery);
  } catch (err) {
    console.error('updateDeliveryStatus error:', err);
    if (err instanceof DeliveryValidationError) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to update delivery status' });
  }
}
