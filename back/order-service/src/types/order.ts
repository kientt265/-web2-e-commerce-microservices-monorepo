export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  userId: string;
  items: OrderItem[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY';
  totalAmount: number;
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

export interface OrderResponse {
  orderId: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY';
  paymentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  deliveryStatus: 'AWAITING_PAYMENT' | 'PENDING' | 'PROCESSING' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'CANCELLED' | 'RETURNED';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
  paymentUrl?: string; // TODO: Implement payment URL generation
}

export interface DeliveryEvent {
  eventType: 'DELIVERY_CREATED' | 'DELIVERY_PICKED_UP' | 'DELIVERY_DELIVERED' | 'DELIVERY_FAILED' | 'DELIVERY_CANCELLED';
  orderId: string;
  userId?: string;
  productId?: string;
  status: string;
  timestamp: string;
}
