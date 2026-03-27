import { useEffect, useState } from 'react';
import type { Order } from '../api/order';
import { formatOrderStatus, formatPaymentStatus, getStatusColor } from '../api/order';
import { formatMoney } from '../utils/money';

type PaymentSuccessProps = {
  order: Order | null;
  onBackToShop: () => void;
  onViewOrderDetail: () => void;
  onCheckPaymentStatus?: () => Promise<boolean>;
};

export function PaymentSuccess({
  order,
  onBackToShop,
  onViewOrderDetail,
  onCheckPaymentStatus,
}: PaymentSuccessProps) {
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    // Check payment status on mount if handler provided
    if (onCheckPaymentStatus && order?.paymentStatus === 'PENDING') {
      handleCheckStatus();
    }
  }, [order?.orderId]);

  const handleCheckStatus = async () => {
    if (!onCheckPaymentStatus || checking) return;
    setChecking(true);
    await onCheckPaymentStatus();
    setChecking(false);
    setLastChecked(new Date());
  };

  const getPaymentResult = () => {
    if (!order) return { icon: '⏳', title: 'Không có thông tin', message: 'Không tìm thấy thông tin đơn hàng.' };

    switch (order.paymentStatus) {
      case 'PAID':
        return {
          icon: '✓',
          title: 'Thanh toán thành công!',
          message: 'Cảm ơn bạn đã thanh toán. Đơn hàng của bạn sẽ được xử lý ngay.',
          color: '#22c55e',
        };
      case 'FAILED':
        return {
          icon: '✕',
          title: 'Thanh toán thất bại',
          message: 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.',
          color: '#ef4444',
        };
      default:
        return {
          icon: '⏳',
          title: 'Đang chờ xác nhận thanh toán',
          message: 'Chúng tôi đang chờ xác nhận thanh toán từ VNPay. Vui lòng kiểm tra lại sau.',
          color: '#f59e0b',
        };
    }
  };

  const result = getPaymentResult();

  return (
    <div className="payment-success-page">
      <div className="payment-success-card">
        <div
          className="result-icon"
          style={{ backgroundColor: result.color + '20', color: result.color }}
        >
          {result.icon}
        </div>

        <h2 className="result-title" style={{ color: result.color }}>
          {result.title}
        </h2>

        <p className="result-message">{result.message}</p>

        {order && (
          <div className="order-summary">
            <div className="summary-row">
              <span>Mã đơn hàng:</span>
              <strong>{order.orderId}</strong>
            </div>
            <div className="summary-row">
              <span>Tổng tiền:</span>
              <strong>{formatMoney(order.totalAmount)}</strong>
            </div>
            <div className="summary-row">
              <span>Trạng thái đơn:</span>
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(order.status) }}
              >
                {formatOrderStatus(order.status)}
              </span>
            </div>
            <div className="summary-row">
              <span>Trạng thái thanh toán:</span>
              <span className={`payment-badge ${order.paymentStatus.toLowerCase()}`}>
                {formatPaymentStatus(order.paymentStatus)}
              </span>
            </div>
          </div>
        )}

        {order?.paymentStatus === 'PENDING' && onCheckPaymentStatus && (
          <div className="check-status-section">
            <button
              type="button"
              className="ghost"
              onClick={handleCheckStatus}
              disabled={checking}
            >
              {checking ? 'Đang kiểm tra...' : 'Kiểm tra lại trạng thái'}
            </button>
            {lastChecked && (
              <p className="muted small">
                Kiểm tra lần cuối: {lastChecked.toLocaleTimeString('vi-VN')}
              </p>
            )}
          </div>
        )}

        <div className="action-buttons">
          <button type="button" className="ghost" onClick={onViewOrderDetail}>
            Xem chi tiết đơn hàng
          </button>
          <button type="button" className="primary" onClick={onBackToShop}>
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    </div>
  );
}
