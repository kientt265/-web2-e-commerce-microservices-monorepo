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

export interface Inventory {
  id: number;
  quantity: number;
  reserved_checkout: number;
  reserved_shipping: number;
  min_threshold: number;
  location?: string;
  updated_at: Date;
}

export interface InventoryTransaction {
  id: number;
  inventory_id: number;
  payment_method: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY';
  payment_status: 'PENDING' | 'PAID' | 'EXPIRED';
  quantity: number;
  order_id: string;
  created_at: Date;
}

export interface InventoryWithTransactions extends Inventory {
  transactions: InventoryTransaction[];
}

export interface CreateInventoryTransactionRequest {
  inventory_id: number;
  payment_method: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY';
  payment_status: 'PENDING' | 'PAID' | 'EXPIRED';
  quantity: number;
  order_id: string;
}

export interface UpdateInventoryRequest {
  quantity?: number;
  reserved_checkout?: number;
  reserved_shipping?: number;
  min_threshold?: number;
  location?: string;
}
