import { useEffect, useState, useCallback } from 'react';
import type { Order, OrderItem, ShippingAddress, CreateOrderRequest } from '../api/order';
import * as orderApi from '../api/order';

export function useOrders(orderBaseUrl: string, userId: string, onLog: (line: string) => void) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!userId) return false;
    setLoading(true);
    setError(null);
    const res = await orderApi.getOrdersByUserId(orderBaseUrl, userId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setOrders(res.data.data || []);
    return true;
  }, [orderBaseUrl, userId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const createOrder = async (
    items: OrderItem[],
    totalAmount: number,
    shippingAddress: ShippingAddress,
    paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY'
  ) => {
    setLoading(true);
    setError(null);

    const body: CreateOrderRequest = {
      userId,
      items,
      totalAmount,
      shippingAddress,
      paymentMethod,
    };

    const res = await orderApi.createOrder(orderBaseUrl, body);
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      onLog(`[order] Failed to create order: ${res.error}`);
      return null;
    }

    const order = res.data.data;
    setCurrentOrder(order);
    onLog(`[order] Created order #${order.orderId}`);

    if (order.paymentUrl) {
      onLog(`[order] Payment URL generated: ${order.paymentUrl.substring(0, 50)}...`);
    }

    await loadOrders();
    return order;
  };

  const getOrder = async (orderId: string) => {
    setLoading(true);
    setError(null);
    const res = await orderApi.getOrderById(orderBaseUrl, orderId);
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return null;
    }

    return res.data.data;
  };

  const refreshCurrentOrder = async () => {
    if (!currentOrder?.orderId) return false;
    const order = await getOrder(currentOrder.orderId);
    if (order) {
      setCurrentOrder(order);
      return true;
    }
    return false;
  };

  return {
    orders,
    currentOrder,
    loading,
    error,
    setError,
    loadOrders,
    createOrder,
    getOrder,
    setCurrentOrder,
    refreshCurrentOrder,
  };
}
