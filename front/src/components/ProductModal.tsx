import type { Product } from '../api/product';
import { formatMoney } from '../utils/money';

export function ProductModal({
  product,
  onClose,
  onAddToCart,
  onNotReady,
}: {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (p: Product) => void;
  onNotReady: (service: string) => void;
}) {
  if (!product) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{product.name}</div>
            <div className="muted small">
              {product.categories?.name
                ? `Category: ${product.categories.name}`
                : product.category_id
                  ? `Category ID: ${product.category_id}`
                  : 'Uncategorized'}
            </div>
          </div>
          <button type="button" className="x" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-media">
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.name} />
            ) : (
              <div className="placeholder big">No image</div>
            )}
          </div>
          <div className="modal-info">
            <div className="price big">{formatMoney(Number(product.price))}</div>
            <div className={product.stock > 0 ? 'stock ok' : 'stock out'}>
              {product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}
            </div>
            <p className="desc">{product.description || 'Không có mô tả.'}</p>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => onNotReady('rating-service')}>
                Xem đánh giá (chưa handle)
              </button>
              <button type="button" className="primary" disabled={product.stock <= 0} onClick={() => onAddToCart(product)}>
                Thêm vào giỏ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

