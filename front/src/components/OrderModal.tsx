import { useState } from 'react';
import type { Order, OrderItem, ShippingAddress } from '../api/order';
import { formatOrderStatus, formatPaymentStatus, getStatusColor } from '../api/order';
import { formatMoney } from '../utils/money';

type OrderModalProps = {
  open: boolean;
  onClose: () => void;
  mode: 'place' | 'history' | 'detail';
  items?: OrderItem[];
  totalAmount?: number;
  onPlaceOrder?: (
    items: OrderItem[],
    totalAmount: number,
    shippingAddress: ShippingAddress,
    paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY'
  ) => Promise<Order | null>;
  orders?: Order[];
  currentOrder?: Order | null;
  loading?: boolean;
  error?: string | null;
  onViewOrderDetail?: (order: Order) => void;
  onGoToPayment?: (paymentUrl: string) => void;
};

const defaultAddress: ShippingAddress = {
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Vietnam',
};

export function OrderModal({
  open,
  onClose,
  mode,
  items = [],
  totalAmount = 0,
  onPlaceOrder,
  orders = [],
  currentOrder,
  loading = false,
  error = null,
  onViewOrderDetail,
  onGoToPayment,
}: OrderModalProps) {
  const [address, setAddress] = useState<ShippingAddress>(defaultAddress);
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY'>('ONLINE_PAYMENT');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  if (!open) return null;

  const handlePlaceOrder = async () => {
    if (!onPlaceOrder || items.length === 0) return;
    if (!address.street || !address.city || !address.state || !address.zipCode) {
      alert('Vui lòng điền đầy đủ thông tin địa chỉ');
      return;
    }
    const order = await onPlaceOrder(items, totalAmount, address, paymentMethod);
    if (order) {
      setPlacedOrder(order);
    }
  };

  const handleClose = () => {
    setPlacedOrder(null);
    setAddress(defaultAddress);
    setPaymentMethod('ONLINE_PAYMENT');
    onClose();
  };

  const handleGoToPayment = () => {
    if (placedOrder?.paymentUrl && onGoToPayment) {
      onGoToPayment(placedOrder.paymentUrl);
    }
  };

  const renderPlaceOrder = () => {
    if (placedOrder) {
      return (
        <div className="order-success">
          <div className="success-icon">✓</div>
          <h3>Đặt hàng thành công!</h3>
          <div className="order-info">
            <p><strong>Mã đơn hàng:</strong> {placedOrder.orderId}</p>
            <p><strong>Tổng tiền:</strong> {formatMoney(placedOrder.totalAmount)}</p>
            <p>
              <strong>Trạng thái:</strong>{' '}
              <span style={{ color: getStatusColor(placedOrder.status) }}>
                {formatOrderStatus(placedOrder.status)}
              </span>
            </p>
            <p>
              <strong>Thanh toán:</strong>{' '}
              <span className={`payment-status ${placedOrder.paymentStatus.toLowerCase()}`}>
                {formatPaymentStatus(placedOrder.paymentStatus)}
              </span>
            </p>
          </div>
          {placedOrder.paymentUrl && paymentMethod === 'ONLINE_PAYMENT' && (
            <div className="payment-section">
              <p>Bạn chưa hoàn tất thanh toán. Nhấn nút bên dưới để thanh toán qua VNPay.</p>
              <button type="button" className="primary" onClick={handleGoToPayment}>
                Thanh toán ngay
              </button>
            </div>
          )}
          <button type="button" className="ghost" onClick={handleClose}>
            Đóng
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="order-items">
          <h4>Sản phẩm đặt hàng</h4>
          {items.map((item, idx) => (
            <div key={idx} className="order-item-row">
              <span>Product ID: {item.productId}</span>
              <span>x{item.quantity}</span>
              <span>{formatMoney(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="order-total">
            <strong>Tổng cộng: {formatMoney(totalAmount)}</strong>
          </div>
        </div>

        <div className="address-form">
          <h4>Thông tin giao hàng</h4>
          <div className="form-row">
            <input
              type="text"
              placeholder="Địa chỉ (số nhà, đường)..."
              value={address.street}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
            />
          </div>
          <div className="form-row two-col">
            <input
              type="text"
              placeholder="Thành phố"
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
            />
            <input
              type="text"
              placeholder="Tỉnh/Thành"
              value={address.state}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
            />
          </div>
          <div className="form-row two-col">
            <input
              type="text"
              placeholder="Mã bưu điện"
              value={address.zipCode}
              onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
            />
            <input
              type="text"
              placeholder="Quốc gia"
              value={address.country}
              onChange={(e) => setAddress({ ...address, country: e.target.value })}
            />
          </div>
        </div>

        <div className="payment-method">
          <h4>Phương thức thanh toán</h4>
          <label className="radio-label">
            <input
              type="radio"
              name="paymentMethod"
              value="ONLINE_PAYMENT"
              checked={paymentMethod === 'ONLINE_PAYMENT'}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
            />
            <span>Thanh toán online (VNPay)</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="paymentMethod"
              value="CASH_ON_DELIVERY"
              checked={paymentMethod === 'CASH_ON_DELIVERY'}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
            />
            <span>Thanh toán khi nhận hàng (COD)</span>
          </label>
        </div>

        {error && <div className="notice error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="ghost" onClick={handleClose} disabled={loading}>
            Hủy
          </button>
          <button
            type="button"
            className="primary"
            onClick={handlePlaceOrder}
            disabled={loading || items.length === 0}
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
          </button>
        </div>
      </>
    );
  };

  const renderOrderHistory = () => (
    <div className="order-history">
      <h4>Lịch sử đơn hàng</h4>
      {orders.length === 0 ? (
        <div className="muted">Chưa có đơn hàng nào.</div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div
              key={order.orderId}
              className="order-card"
              onClick={() => onViewOrderDetail?.(order)}
            >
              <div className="order-header">
                <span className="order-id">{order.orderId}</span>
                <span
                  className="order-status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {formatOrderStatus(order.status)}
                </span>
              </div>
              <div className="order-body">
                <div className="order-meta">
                  <span>{order.items.length} sản phẩm</span>
                  <span>{formatMoney(order.totalAmount)}</span>
                </div>
                <div className="order-payment">
                  <span className={`payment-badge ${order.paymentStatus.toLowerCase()}`}>
                    {formatPaymentStatus(order.paymentStatus)}
                  </span>
                  <span className="order-date">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderOrderDetail = () => {
    if (!currentOrder) return <div className="muted">Không có thông tin đơn hàng.</div>;

    return (
      <div className="order-detail">
        <div className="detail-header">
          <h4>Chi tiết đơn hàng {currentOrder.orderId}</h4>
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor(currentOrder.status) }}
          >
            {formatOrderStatus(currentOrder.status)}
          </span>
        </div>

        <div className="detail-section">
          <h5>Sản phẩm</h5>
          {currentOrder.items.map((item, idx) => (
            <div key={idx} className="detail-item">
              <span>Product ID: {item.productId}</span>
              <span>x{item.quantity}</span>
              <span>{formatMoney(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="detail-total">
            <strong>Tổng: {formatMoney(currentOrder.totalAmount)}</strong>
          </div>
        </div>

        <div className="detail-section">
          <h5>Thông tin giao hàng</h5>
          <p>{currentOrder.shippingAddress.street}</p>
          <p>
            {currentOrder.shippingAddress.city}, {currentOrder.shippingAddress.state}{' '}
            {currentOrder.shippingAddress.zipCode}
          </p>
          <p>{currentOrder.shippingAddress.country}</p>
        </div>

        <div className="detail-section">
          <h5>Thông tin thanh toán</h5>
          <p>
            <strong>Phương thức:</strong>{' '}
            {currentOrder.paymentMethod === 'ONLINE_PAYMENT'
              ? 'Thanh toán online'
              : 'Thanh toán khi nhận hàng'}
          </p>
          <p>
            <strong>Trạng thái:</strong>{' '}
            <span className={`payment-badge ${currentOrder.paymentStatus.toLowerCase()}`}>
              {formatPaymentStatus(currentOrder.paymentStatus)}
            </span>
          </p>
        </div>

        <div className="detail-meta">
          <p className="muted small">
            Đặt hàng: {new Date(currentOrder.createdAt).toLocaleString('vi-VN')}
          </p>
          <p className="muted small">
            Cập nhật: {new Date(currentOrder.updatedAt).toLocaleString('vi-VN')}
          </p>
        </div>
      </div>
    );
  };

  const getTitle = () => {
    switch (mode) {
      case 'place':
        return placedOrder ? 'Đặt hàng thành công' : 'Xác nhận đặt hàng';
      case 'history':
        return 'Lịch sử đơn hàng';
      case 'detail':
        return 'Chi tiết đơn hàng';
      default:
        return 'Đơn hàng';
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={handleClose}>
      <div className="modal wide" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{getTitle()}</div>
          <button type="button" className="x" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {mode === 'place' && renderPlaceOrder()}
          {mode === 'history' && renderOrderHistory()}
          {mode === 'detail' && renderOrderDetail()}
        </div>
      </div>
    </div>
  );
}
