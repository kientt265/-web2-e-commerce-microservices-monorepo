import { useState } from 'react';
import type { Delivery } from '../api/delivery';
import {
  formatDeliveryStatus,
  getDeliveryStatusColor,
  getDeliveryStatusIcon,
} from '../api/delivery';
import { formatMoney } from '../utils/money';

type DeliveryModalProps = {
  open: boolean;
  onClose: () => void;
  deliveries: Delivery[];
  currentDelivery: Delivery | null;
  loading: boolean;
  error: string | null;
  onViewDeliveryDetail: (delivery: Delivery) => void;
  onBackToList: () => void;
  onRefresh: () => void;
};

export function DeliveryModal({
  open,
  onClose,
  deliveries,
  currentDelivery,
  loading,
  error,
  onViewDeliveryDetail,
  onBackToList,
  onRefresh,
}: DeliveryModalProps) {
  const [view, setView] = useState<'list' | 'detail'>('list');

  if (!open) return null;

  const handleViewDetail = (delivery: Delivery) => {
    onViewDeliveryDetail(delivery);
    setView('detail');
  };

  const handleBack = () => {
    onBackToList();
    setView('list');
  };

  const renderDeliveryList = () => {
    if (loading) {
      return <div className="muted">Đang tải...</div>;
    }

    if (error) {
      return <div className="notice error">{error}</div>;
    }

    if (deliveries.length === 0) {
      return <div className="muted">Không có đơn hàng nào đang giao.</div>;
    }

    // Separate active and completed deliveries
    const activeDeliveries = deliveries.filter((d) =>
      ['PENDING', 'PROCESSING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(
        d.status
      )
    );
    const completedDeliveries = deliveries.filter((d) =>
      ['DELIVERED', 'CANCELLED', 'FAILED', 'RETURNED'].includes(d.status)
    );

    return (
      <div className="delivery-list">
        {activeDeliveries.length > 0 && (
          <div className="delivery-section">
            <h4 className="delivery-section-title">
              <span>🚚</span> Đang giao hàng ({activeDeliveries.length})
            </h4>
            <div className="delivery-cards">
              {activeDeliveries.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  onClick={() => handleViewDetail(delivery)}
                />
              ))}
            </div>
          </div>
        )}

        {completedDeliveries.length > 0 && (
          <div className="delivery-section">
            <h4 className="delivery-section-title">
              <span>📦</span> Đã hoàn thành ({completedDeliveries.length})
            </h4>
            <div className="delivery-cards">
              {completedDeliveries.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  onClick={() => handleViewDetail(delivery)}
                  isCompleted
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDeliveryDetail = () => {
    if (!currentDelivery) return null;

    const statusColor = getDeliveryStatusColor(currentDelivery.status);
    const statusIcon = getDeliveryStatusIcon(currentDelivery.status);
    const events = currentDelivery.delivery_events || [];

    // Sort events by date (newest first)
    const sortedEvents = [...events].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return (
      <div className="delivery-detail">
        <div className="detail-header">
          <button type="button" className="ghost" onClick={handleBack}>
            ← Quay lại
          </button>
          <button type="button" className="ghost" onClick={onRefresh}>
            🔄 Làm mới
          </button>
        </div>

        <div className="delivery-status-card">
          <div
            className="status-icon-large"
            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
          >
            {statusIcon}
          </div>
          <div className="status-info">
            <div
              className="status-badge-large"
              style={{ backgroundColor: statusColor }}
            >
              {formatDeliveryStatus(currentDelivery.status)}
            </div>
            <div className="delivery-id">Mã vận đơn: #{currentDelivery.id}</div>
            <div className="order-id">Mã đơn hàng: {currentDelivery.order_id}</div>
          </div>
        </div>

        {currentDelivery.tracking_code && (
          <div className="tracking-info">
            <div className="tracking-label">Mã tracking:</div>
            <div className="tracking-code">{currentDelivery.tracking_code}</div>
          </div>
        )}

        <div className="delivery-info-grid">
          <InfoItem
            label="Đơn vị vận chuyển"
            value={currentDelivery.carrier || 'Chưa cập nhật'}
          />
          <InfoItem
            label="Phí vận chuyển"
            value={
              currentDelivery.shipping_fee
                ? formatMoney(Number(currentDelivery.shipping_fee))
                : 'Chưa cập nhật'
            }
          />
          <InfoItem
            label="Ngày tạo"
            value={new Date(currentDelivery.created_at).toLocaleDateString('vi-VN')}
          />
          <InfoItem
            label="Dự kiến giao"
            value={
              currentDelivery.estimated_at
                ? new Date(currentDelivery.estimated_at).toLocaleDateString('vi-VN')
                : 'Chưa cập nhật'
            }
          />
        </div>

        <div className="shipping-address">
          <h5>📍 Địa chỉ giao hàng</h5>
          <p>{currentDelivery.shipping_address}</p>
          {(currentDelivery.city || currentDelivery.district) && (
            <p className="address-detail">
              {[currentDelivery.ward, currentDelivery.district, currentDelivery.city]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>

        {currentDelivery.notes && (
          <div className="delivery-notes">
            <h5>📝 Ghi chú</h5>
            <p>{currentDelivery.notes}</p>
          </div>
        )}

        {sortedEvents.length > 0 && (
          <div className="delivery-timeline">
            <h5>📋 Lịch sử vận chuyển</h5>
            <div className="timeline">
              {sortedEvents.map((event, index) => (
                <div key={event.id} className="timeline-item">
                  <div
                    className="timeline-dot"
                    style={{ backgroundColor: getDeliveryStatusColor(event.status) }}
                  />
                  <div className="timeline-content">
                    <div className="timeline-status">
                      {getDeliveryStatusIcon(event.status)}{' '}
                      {formatDeliveryStatus(event.status)}
                    </div>
                    {event.description && (
                      <div className="timeline-desc">{event.description}</div>
                    )}
                    {event.location && (
                      <div className="timeline-location">📍 {event.location}</div>
                    )}
                    <div className="timeline-date">
                      {new Date(event.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  {index < sortedEvents.length - 1 && (
                    <div className="timeline-line" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal wide" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            {view === 'detail' ? 'Chi tiết giao hàng' : 'Theo dõi giao hàng'}
          </div>
          <button type="button" className="x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {view === 'list' ? renderDeliveryList() : renderDeliveryDetail()}
        </div>
      </div>
    </div>
  );
}

// Delivery Card Component
function DeliveryCard({
  delivery,
  onClick,
  isCompleted = false,
}: {
  delivery: Delivery;
  onClick: () => void;
  isCompleted?: boolean;
}) {
  const statusColor = getDeliveryStatusColor(delivery.status);
  const statusIcon = getDeliveryStatusIcon(delivery.status);

  return (
    <div
      className={`delivery-card ${isCompleted ? 'completed' : ''}`}
      onClick={onClick}
    >
      <div className="delivery-card-header">
        <div className="delivery-card-id">
          <span>📦</span> #{delivery.id}
        </div>
        <div
          className="delivery-status-badge"
          style={{ backgroundColor: statusColor }}
        >
          {statusIcon} {formatDeliveryStatus(delivery.status)}
        </div>
      </div>

      <div className="delivery-card-body">
        <div className="delivery-card-info">
          <div className="delivery-card-label">Mã đơn hàng:</div>
          <div className="delivery-card-value">{delivery.order_id}</div>
        </div>
        {delivery.carrier && (
          <div className="delivery-card-info">
            <div className="delivery-card-label">Vận chuyển:</div>
            <div className="delivery-card-value">{delivery.carrier}</div>
          </div>
        )}
        {delivery.tracking_code && (
          <div className="delivery-card-info">
            <div className="delivery-card-label">Tracking:</div>
            <div className="delivery-card-value highlight">
              {delivery.tracking_code}
            </div>
          </div>
        )}
      </div>

      <div className="delivery-card-footer">
        <div className="delivery-card-date">
          {new Date(delivery.created_at).toLocaleDateString('vi-VN')}
        </div>
        <div className="delivery-card-arrow">→</div>
      </div>
    </div>
  );
}

// Info Item Component
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-item">
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>
    </div>
  );
}
