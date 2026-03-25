import { fetchJson } from './http';

export type OrderItem = {
  productId: string;
  quantity: number;
  price: number;
};

export type ShippingAddress = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

export type Order = {
  orderId: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  shippingAddress: ShippingAddress;
  createdAt: string;
  updatedAt: string;
  paymentUrl?: string | null;
};

export type CreateOrderRequest = {
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: ShippingAddress;
  paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY';
};

export type CreateOrderResponse = {
  success: boolean;
  data: Order;
  message: string;
};

export type CreatePaymentUrlRequest = {
  orderId: string;
  amount: number;
  orderInfo: string;
  bankCode?: string;
};

export type CreatePaymentUrlResponse = {
  success: boolean;
  data: {
    paymentUrl: string;
    orderId: string;
    amount: number;
  };
  message: string;
};

export type GetOrdersResponse = {
  success: boolean;
  data: Order[];
  count: number;
};

export type GetOrderResponse = {
  success: boolean;
  data: Order;
};

export async function createOrder(baseUrl: string, body: CreateOrderRequest) {
  return await fetchJson<CreateOrderResponse>(`${baseUrl}/api/orders`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getOrderById(baseUrl: string, orderId: string) {
  return await fetchJson<GetOrderResponse>(`${baseUrl}/api/orders/${orderId}`);
}

export async function getOrdersByUserId(baseUrl: string, userId: string) {
  return await fetchJson<GetOrdersResponse>(`${baseUrl}/api/orders/user/${userId}`);
}

export async function createPaymentUrl(baseUrl: string, body: CreatePaymentUrlRequest) {
  return await fetchJson<CreatePaymentUrlResponse>(`${baseUrl}/api/orders/payment-url`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function formatOrderStatus(status: Order['status']): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'Đang chờ xử lý',
    'PROCESSING': 'Đang xử lý',
    'COMPLETED': 'Hoàn thành',
    'CANCELLED': 'Đã hủy',
    'REFUNDED': 'Đã hoàn tiền',
  };
  return statusMap[status] || status;
}

export function formatPaymentStatus(status: Order['paymentStatus']): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'Chưa thanh toán',
    'PAID': 'Đã thanh toán',
    'FAILED': 'Thanh toán thất bại',
  };
  return statusMap[status] || status;
}

export function getStatusColor(status: Order['status']): string {
  const colorMap: Record<string, string> = {
    'PENDING': '#f59e0b',
    'PROCESSING': '#3b82f6',
    'COMPLETED': '#22c55e',
    'CANCELLED': '#ef4444',
    'REFUNDED': '#6b7280',
  };
  return colorMap[status] || '#6b7280';
}
