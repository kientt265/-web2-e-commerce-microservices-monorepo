import { PrismaClient, DeliveryStatus, Prisma } from '@prisma/client';
import {
  DeliveryQueryParams,
  CreateDeliveryData,
  UpdateDeliveryData,
  UpdateStatusData,
  DeliveryListResponse,
  DeliveryPagination,
  DeliveryValidationError,
  DeliveryValidationUtils
} from '../types/delivery';
import { saveDeliveryOutcomeOutbox } from './outboxService';

const prisma = new PrismaClient();

export class DeliveryService {
  async getAllDeliveries(query: DeliveryQueryParams): Promise<DeliveryListResponse> {
    const { page = '1', limit = '10', status } = query;
    const pageNum = DeliveryValidationUtils.parseId(page) || 1;
    const limitNum = DeliveryValidationUtils.parseId(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) {
      const deliveryStatus = DeliveryValidationUtils.parseDeliveryStatus(status);
      if (deliveryStatus) where.status = deliveryStatus;
    }

    const [deliveries, total] = await Promise.all([
      prisma.deliveries.findMany({
        where,
        include: { delivery_events: true },
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
      }),
      prisma.deliveries.count({ where }),
    ]);

    const pagination: DeliveryPagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    };

    return { deliveries, pagination };
  }

  async getDeliveryById(id: string) {
    const deliveryId = DeliveryValidationUtils.validateDeliveryId(id);

    const delivery = await prisma.deliveries.findUnique({
      where: { id: deliveryId },
      include: { delivery_events: true },
    });

    if (!delivery) {
      throw new DeliveryValidationError('Delivery not found');
    }

    return delivery;
  }

  async createDeliveryWithStatus(data: CreateDeliveryData, status: DeliveryStatus = 'PENDING') {
    const {
      order_id,
      user_id,
      product_id,
      quantity,
      carrier,
      shipping_address,
      city,
      district,
      ward,
      postcode,
      estimated_at,
      shipping_fee,
      notes,
    } = data;

    if (!order_id || !shipping_address) {
      throw new DeliveryValidationError('order_id and shipping_address are required');
    }

    const orderId = DeliveryValidationUtils.validateOrderId(order_id.toString());
    const shippingFee = shipping_fee ? DeliveryValidationUtils.parseDecimal(shipping_fee) : null;

    const delivery = await prisma.deliveries.create({
      data: {
        order_id: orderId,
        user_id: user_id || null,
        product_id: product_id || null,
        quantity: quantity || null,
        carrier,
        shipping_address,
        city,
        district,
        ward,
        postcode,
        estimated_at: estimated_at ? new Date(estimated_at) : null,
        shipping_fee: shippingFee,
        notes,
        status, // Use provided status instead of default
        created_at: new Date(),
        updated_at: new Date(),
      },
      include: { delivery_events: true },
    });

    return delivery;
  }

  async createDelivery(data: CreateDeliveryData) {
    const {
      order_id,
      user_id,
      product_id,
      quantity,
      carrier,
      shipping_address,
      city,
      district,
      ward,
      postcode,
      estimated_at,
      shipping_fee,
      notes,
    } = data;

    if (!order_id || !shipping_address) {
      throw new DeliveryValidationError('order_id and shipping_address are required');
    }

    const orderId = DeliveryValidationUtils.validateOrderId(order_id.toString());
    const shippingFee = shipping_fee ? DeliveryValidationUtils.parseDecimal(shipping_fee) : null;

    const delivery = await prisma.deliveries.create({
      data: {
        order_id: orderId,
        user_id: user_id || null,
        product_id: product_id || null,
        quantity: quantity || null,
        carrier,
        shipping_address,
        city,
        district,
        ward,
        postcode,
        estimated_at: estimated_at ? new Date(estimated_at) : null,
        shipping_fee: shippingFee,
        notes,
        created_at: new Date(),
        updated_at: new Date(),
      },
      include: { delivery_events: true },
    });

    return delivery;
  }

  async updateDelivery(id: string, data: UpdateDeliveryData) {
    const deliveryId = DeliveryValidationUtils.validateDeliveryId(id);

    const {
      tracking_code,
      carrier,
      status,
      shipping_address,
      city,
      district,
      ward,
      postcode,
      estimated_at,
      delivered_at,
      cancelled_at,
      shipping_fee,
      notes,
      quantity,
    } = data;

    const updateData: any = { updated_at: new Date() };
    let resolvedStatus: DeliveryStatus | undefined;

    if (tracking_code !== undefined) updateData.tracking_code = tracking_code;
    if (carrier !== undefined) updateData.carrier = carrier;
    if (status !== undefined) {
      const deliveryStatus = DeliveryValidationUtils.parseDeliveryStatus(status);
      if (!deliveryStatus) throw new DeliveryValidationError('Invalid delivery status');
      updateData.status = deliveryStatus;
      resolvedStatus = deliveryStatus;
    }
    if (shipping_address !== undefined) updateData.shipping_address = shipping_address;
    if (city !== undefined) updateData.city = city;
    if (district !== undefined) updateData.district = district;
    if (ward !== undefined) updateData.ward = ward;
    if (postcode !== undefined) updateData.postcode = postcode;
    if (estimated_at !== undefined) updateData.estimated_at = estimated_at ? new Date(estimated_at) : null;
    if (delivered_at !== undefined) updateData.delivered_at = delivered_at ? new Date(delivered_at) : null;
    if (cancelled_at !== undefined) updateData.cancelled_at = cancelled_at ? new Date(cancelled_at) : null;
    if (shipping_fee !== undefined) {
      const fee = DeliveryValidationUtils.validateShippingFee(shipping_fee);
      updateData.shipping_fee = fee;
    }
    if (notes !== undefined) updateData.notes = notes;
    if (quantity !== undefined) updateData.quantity = quantity;

    if (resolvedStatus === 'DELIVERED' || resolvedStatus === 'FAILED') {
      return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const delivery = await tx.deliveries.update({
          where: { id: deliveryId },
          data: updateData,
          include: { delivery_events: true },
        });
        await saveDeliveryOutcomeOutbox(tx, {
          deliveryId,
          orderId: delivery.order_id,
          status: resolvedStatus,
          userId: delivery.user_id,
          productId: delivery.product_id,
          quantity: delivery.quantity,
        });
        return delivery;
      });
    }

    const delivery = await prisma.deliveries.update({
      where: { id: deliveryId },
      data: updateData,
      include: { delivery_events: true },
    });

    return delivery;
  }

  async deleteDelivery(id: string) {
    const deliveryId = DeliveryValidationUtils.validateDeliveryId(id);

    await prisma.deliveries.delete({
      where: { id: deliveryId },
    });
  }

  async getDeliveriesByOrderId(orderIdParam: string) {
    const orderId = DeliveryValidationUtils.validateOrderId(orderIdParam);

    const deliveries = await prisma.deliveries.findMany({
      where: { order_id: orderId },
      include: { delivery_events: true },
      orderBy: { created_at: 'desc' },
    });

    return deliveries;
  }

  async updateDeliveryStatus(id: string, data: UpdateStatusData) {
    const deliveryId = DeliveryValidationUtils.validateDeliveryId(id);
    const { status, description, location } = data;

    const deliveryStatus = DeliveryValidationUtils.parseDeliveryStatus(status);
    if (!deliveryStatus) throw new DeliveryValidationError('Invalid delivery status');

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const delivery = await tx.deliveries.update({
        where: { id: deliveryId },
        data: {
          status: deliveryStatus,
          updated_at: new Date(),
          ...(deliveryStatus === 'DELIVERED' && { delivered_at: new Date() }),
          ...(deliveryStatus === 'CANCELLED' && { cancelled_at: new Date() }),
        },
        include: { delivery_events: true },
      });

      await tx.delivery_events.create({
        data: {
          delivery_id: deliveryId,
          status: deliveryStatus,
          description,
          location,
          created_at: new Date(),
        },
      });

      if (deliveryStatus === 'DELIVERED' || deliveryStatus === 'FAILED') {
        await saveDeliveryOutcomeOutbox(tx, {
          deliveryId,
          orderId: delivery.order_id,
          status: deliveryStatus,
          userId: delivery.user_id,
          productId: delivery.product_id,
          quantity: delivery.quantity,
        });
      }

      return delivery;
    });
  }

  async updateDeliveryStatusFromPayment(orderId: string, newStatus: DeliveryStatus): Promise<void> {
    try {
      const orderIdValid = DeliveryValidationUtils.validateOrderId(orderId);
      
      // Find delivery for this order
      const delivery = await prisma.deliveries.findFirst({
        where: { order_id: orderIdValid },
      });

      if (!delivery) {
        console.log(`⚠️ No delivery found for order ${orderIdValid}`);
        return;
      }

      console.log(`🔄 Updating delivery ${delivery.id} status from ${delivery.status} to ${newStatus}`);
      
      // Update delivery status
      const updatedDelivery = await prisma.deliveries.update({
        where: { id: delivery.id },
        data: {
          status: newStatus,
          updated_at: new Date(),
        },
        include: { delivery_events: true },
      });

      // Create delivery event record
      await prisma.delivery_events.create({
        data: {
          delivery_id: delivery.id,
          status: newStatus,
          description: `Status updated from payment event: ${newStatus}`,
          created_at: new Date(),
        },
      });

      console.log(`✅ Delivery status updated: ${delivery.id} → ${newStatus}`);
    } catch (error) {
      console.error(`❌ Error updating delivery status for order ${orderId}:`, error);
      throw error;
    }
  }

  async processOrderEvent(orderEvent: any, initialStatus: DeliveryStatus = 'PENDING') {
    try {
      const orderId = DeliveryValidationUtils.validateOrderId(orderEvent.orderId);
      
      // Check if delivery already exists for this order
      const existingDelivery = await prisma.deliveries.findFirst({
        where: { order_id: orderId },
      });

      if (existingDelivery) {
        console.log(`Delivery already exists for order ${orderId}, skipping...`);
        return existingDelivery;
      }

      // Create new delivery from order event
      const firstItem = Array.isArray(orderEvent.items) ? orderEvent.items[0] : undefined;
      const deliveryData: CreateDeliveryData = {
        order_id: orderId,
        user_id: typeof orderEvent.userId === 'string' ? orderEvent.userId : undefined,
        product_id:
          firstItem && typeof firstItem.productId === 'string' ? firstItem.productId : undefined,
        quantity: firstItem && typeof firstItem.quantity === 'number' ? firstItem.quantity : undefined,
        shipping_address: orderEvent.shippingAddress?.street || '',
        city: orderEvent.shippingAddress?.city,
        district: orderEvent.shippingAddress?.state,
        postcode: orderEvent.shippingAddress?.zipCode,
        notes: `Auto-created for ${orderEvent.paymentMethod?.toLowerCase().replace('_', ' ')} order ${orderId}`,
      };

      const delivery = await this.createDeliveryWithStatus(deliveryData, initialStatus);
      console.log(`✅ Created delivery ${delivery.id} for order ${orderId}`);
      
      return delivery;
    } catch (error) {
      console.error(`❌ Error processing order event for order ${orderEvent.orderId}:`, error);
      throw error;
    }
  }
}

export const deliveryService = new DeliveryService();