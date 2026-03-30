import { useState, useCallback, useMemo } from 'react';
import type { Delivery, DeliveryStatus } from '../api/delivery';
import * as deliveryApi from '../api/delivery';

type UseDeliveriesOptions = {
  baseUrl: string;
  userId?: string | null;
  onLog?: (line: string) => void;
};

export function useDeliveries({ baseUrl, userId, onLog }: UseDeliveriesOptions) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [currentDelivery, setCurrentDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const log = useCallback(
    (line: string) => {
      console.log(line);
      onLog?.(line);
    },
    [onLog]
  );

  // Load deliveries for current user
  const loadUserDeliveries = useCallback(async () => {
    if (!userId) {
      setError('Vui lòng đăng nhập để xem thông tin giao hàng');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await deliveryApi.getDeliveriesByUserId(baseUrl, userId);
      if (res.ok && res.data?.success) {
        setDeliveries(res.data.data);
        log(`[delivery] Loaded ${res.data.data.length} deliveries for user ${userId}`);
      } else if (!res.ok) {
        setError(res.error || 'Không thể tải thông tin giao hàng');
        log(`[delivery] Error loading deliveries: ${res.error}`);
      } else {
        setError('Không thể tải thông tin giao hàng');
        log(`[delivery] Error: API returned unsuccessful response`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      log(`[delivery] Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, userId, log]);

  // Load deliveries by order ID
  const loadDeliveriesByOrderId = useCallback(
    async (orderId: string) => {
      setLoading(true);
      setError(null);

      try {
        const res = await deliveryApi.getDeliveriesByOrderId(baseUrl, orderId);
        
        if (res.ok) {
          // Handle both array and wrapped object responses
          const deliveryData = Array.isArray(res.data) 
            ? res.data 
            : (res.data?.success ? res.data.data : []);

          setDeliveries(deliveryData);
          if (deliveryData.length > 0) {
            setCurrentDelivery(deliveryData[0]);
          }
          log(`[delivery] Loaded ${deliveryData.length} deliveries for order ${orderId}`);
          return deliveryData;
        } else {
          setError(res.error || 'Không thể tải thông tin giao hàng');
          log(`[delivery] Error loading deliveries: ${res.error}`);
          return [];
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        log(`[delivery] Error: ${msg}`);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, log]
  );

  // Get delivery by ID
  const getDelivery = useCallback(
    async (deliveryId: string | number) => {
      setLoading(true);
      setError(null);

      try {
        const res = await deliveryApi.getDeliveryById(baseUrl, deliveryId);
        if (res.ok && res.data?.success) {
          setCurrentDelivery(res.data.data);
          log(`[delivery] Loaded delivery #${deliveryId}`);
          return res.data.data;
        } else if (!res.ok) {
          setError(res.error || 'Không thể tải thông tin giao hàng');
          log(`[delivery] Error loading delivery: ${res.error}`);
          return null;
        } else {
          setError('Không thể tải thông tin giao hàng');
          log(`[delivery] Error: API returned unsuccessful response by ID`);
          return null;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        log(`[delivery] Error: ${msg}`);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, log]
  );

  // Load all deliveries (with pagination)
  const loadAllDeliveries = useCallback(
    async (page: number = 1, limit: number = 10, status?: DeliveryStatus) => {
      setLoading(true);
      setError(null);

      try {
        const res = await deliveryApi.getDeliveries(baseUrl, page, limit, status);
        if (res.ok && res.data?.success) {
          setDeliveries(res.data.data.deliveries);
          setPagination(res.data.data.pagination);
          log(
            `[delivery] Loaded ${res.data.data.deliveries.length} deliveries (page ${page})`
          );
        } else if (!res.ok) {
          setError(res.error || 'Không thể tải danh sách giao hàng');
          log(`[delivery] Error: ${res.error}`);
        } else {
          setError('Không thể tải danh sách giao hàng');
          log(`[delivery] Error: API returned unsuccessful response`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        log(`[delivery] Error: ${msg}`);
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, log]
  );

  // Refresh current delivery
  const refreshCurrentDelivery = useCallback(async () => {
    if (currentDelivery?.id) {
      await getDelivery(currentDelivery.id);
    }
  }, [currentDelivery?.id, getDelivery]);

  // Get active deliveries (in progress)
  const activeDeliveries = useMemo(() => {
    return deliveries.filter((d) =>
      ['PENDING', 'PROCESSING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(
        d.status
      )
    );
  }, [deliveries]);

  // Get completed deliveries
  const completedDeliveries = useMemo(() => {
    return deliveries.filter((d) =>
      ['DELIVERED', 'CANCELLED', 'FAILED', 'RETURNED'].includes(d.status)
    );
  }, [deliveries]);

  return {
    deliveries,
    currentDelivery,
    loading,
    error,
    pagination,
    activeDeliveries,
    completedDeliveries,
    loadUserDeliveries,
    loadDeliveriesByOrderId,
    loadAllDeliveries,
    getDelivery,
    setCurrentDelivery,
    refreshCurrentDelivery,
    setError,
  };
}
