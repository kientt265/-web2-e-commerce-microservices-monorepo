import { DeliveryStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface DeliveryQueryParams {
  page?: string;
  limit?: string;
  status?: DeliveryStatus;
}

export interface CreateDeliveryData {
  order_id: string;
  user_id?: string;
  product_id?: string;
  quantity?: number;
  carrier?: string;
  shipping_address: string;
  city?: string;
  district?: string;
  ward?: string;
  postcode?: string;
  estimated_at?: string;
  shipping_fee?: string | number;
  notes?: string;
}

export interface UpdateDeliveryData {
  tracking_code?: string;
  carrier?: string;
  status?: DeliveryStatus;
  shipping_address?: string;
  city?: string;
  district?: string;
  ward?: string;
  postcode?: string;
  estimated_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  shipping_fee?: string | number;
  notes?: string;
  quantity?: number;
}

export interface UpdateStatusData {
  status: DeliveryStatus;
  description?: string;
  location?: string;
}

export interface DeliveryPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface DeliveryListResponse {
  deliveries: any[];
  pagination: DeliveryPagination;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface OrderEvent {
  eventType: string;
  orderId: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY';
  timestamp: string;
}

export class DeliveryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeliveryValidationError';
  }
}

export const DeliveryValidationUtils = {
  parseId(raw: string): number | null {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  },

  parseDecimal(raw: unknown): Prisma.Decimal | null {
    if (raw === undefined || raw === null || raw === '') return null;
    try {
      return new Prisma.Decimal(raw as any);
    } catch {
      return null;
    }
  },

  parseDeliveryStatus(raw: unknown): DeliveryStatus | null {
    if (typeof raw !== 'string') return null;
    return Object.values(DeliveryStatus).includes(raw as DeliveryStatus) ? raw as DeliveryStatus : null;
  },

  validateDeliveryId(id: string): number {
    const parsedId = this.parseId(id);
    if (!parsedId) {
      throw new DeliveryValidationError('Invalid delivery ID');
    }
    return parsedId;
  },

  /**
   * Order service publishes order IDs as strings (e.g. order_45045775 or cuid strings)
   */
  validateOrderId(id: string): string {
    const trimmed = String(id).trim();
    if (!trimmed) {
      throw new DeliveryValidationError('Invalid order ID');
    }
    return trimmed;
  },

  validateShippingFee(fee: unknown): Prisma.Decimal | null {
    if (fee === null || fee === undefined || fee === '') return null;
    const parsedFee = this.parseDecimal(fee);
    if (!parsedFee) {
      throw new DeliveryValidationError('Invalid shipping_fee format');
    }
    return parsedFee;
  }
};
