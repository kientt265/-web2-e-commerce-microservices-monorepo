import { fetchJson } from './http';

export type DeliveryStatus =
  | 'AWAITING_PAYMENT'
  | 'PENDING'
  | 'PROCESSING'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RETURNED';

export type DeliveryEvent = {
  id: number;
  delivery_id: number;
  status: DeliveryStatus;
  description?: string;
  location?: string;
  created_at: string;
};

export type Delivery = {
  id: number;
  order_id: string;
  user_id?: string;
  product_id?: string;
  quantity?: number;
  carrier?: string;
  tracking_code?: string;
  shipping_address: string;
  city?: string;
  district?: string;
  ward?: string;
  postcode?: string;
  status: DeliveryStatus;
  shipping_fee?: number;
  estimated_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  delivery_events: DeliveryEvent[];
};

export type DeliveryPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type DeliveryListResponse = {
  success: boolean;
  data: {
    deliveries: Delivery[];
    pagination: DeliveryPagination;
  };
  message: string;
};

export type DeliveryResponse = {
  success: boolean;
  data: Delivery;
  message: string;
};

export type CreateDeliveryRequest = {
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
  shipping_fee?: number;
  notes?: string;
};

export type UpdateDeliveryStatusRequest = {
  status: DeliveryStatus;
  description?: string;
  location?: string;
};

// Get all deliveries with pagination
export async function getDeliveries(
  baseUrl: string,
  page: number = 1,
  limit: number = 10,
  status?: DeliveryStatus
) {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (status) params.append('status', status);

  return await fetchJson<DeliveryListResponse>(
    `${baseUrl}/deliveries?${params.toString()}`
  );
}

// Get delivery by ID
export async function getDeliveryById(baseUrl: string, deliveryId: string | number) {
  return await fetchJson<DeliveryResponse>(`${baseUrl}/deliveries/${deliveryId}`);
}

// Get deliveries by user ID
export async function getDeliveriesByUserId(baseUrl: string, userId: string) {
  return await fetchJson<{
    success: boolean;
    data: Delivery[];
    message: string;
  }>(`${baseUrl}/users/${userId}/deliveries`);
}

// Get deliveries by order ID
export async function getDeliveriesByOrderId(baseUrl: string, orderId: string) {
  return await fetchJson<{
    success: boolean;
    data: Delivery[];
    message: string;
  } | Delivery[]>(`${baseUrl}/orders/${orderId}/deliveries`);
}

// Create delivery (admin only typically)
export async function createDelivery(baseUrl: string, body: CreateDeliveryRequest) {
  return await fetchJson<DeliveryResponse>(`${baseUrl}/deliveries`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Update delivery status
export async function updateDeliveryStatus(
  baseUrl: string,
  deliveryId: string | number,
  body: UpdateDeliveryStatusRequest
) {
  return await fetchJson<DeliveryResponse>(
    `${baseUrl}/deliveries/${deliveryId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
}

// Format delivery status to Vietnamese
export function formatDeliveryStatus(status: DeliveryStatus): string {
  const statusMap: Record<DeliveryStatus, string> = {
    'AWAITING_PAYMENT': 'Chờ thanh toán',
    'PENDING': 'Chờ xử lý',
    'PROCESSING': 'Đang xử lý',
    'PICKED_UP': 'Đã lấy hàng',
    'IN_TRANSIT': 'Đang vận chuyển',
    'OUT_FOR_DELIVERY': 'Đang giao hàng',
    'DELIVERED': 'Đã giao hàng',
    'FAILED': 'Giao hàng thất bại',
    'CANCELLED': 'Đã hủy',
    'RETURNED': 'Đã hoàn trả',
  };
  return statusMap[status] || status;
}

// Get status color for UI
export function getDeliveryStatusColor(status: DeliveryStatus): string {
  const colorMap: Record<DeliveryStatus, string> = {
    'AWAITING_PAYMENT': '#f59e0b', // amber
    'PENDING': '#6b7280', // gray
    'PROCESSING': '#3b82f6', // blue
    'PICKED_UP': '#8b5cf6', // violet
    'IN_TRANSIT': '#0ea5e9', // sky
    'OUT_FOR_DELIVERY': '#f97316', // orange
    'DELIVERED': '#22c55e', // green
    'FAILED': '#ef4444', // red
    'CANCELLED': '#6b7280', // gray
    'RETURNED': '#ec4899', // pink
  };
  return colorMap[status] || '#6b7280';
}

// Get status icon/emoji
export function getDeliveryStatusIcon(status: DeliveryStatus): string {
  const iconMap: Record<DeliveryStatus, string> = {
    'AWAITING_PAYMENT': '💳',
    'PENDING': '⏳',
    'PROCESSING': '📦',
    'PICKED_UP': '🚚',
    'IN_TRANSIT': '🚛',
    'OUT_FOR_DELIVERY': '📮',
    'DELIVERED': '✅',
    'FAILED': '❌',
    'CANCELLED': '🚫',
    'RETURNED': '↩️',
  };
  return iconMap[status] || '📋';
}
