import type { Product } from '../api/product';
import { formatMoney } from '../utils/money';

export function ProductGrid({
  loading,
  products,
  ratingStats = {},
  onOpen,
  onAddToCart,
}: {
  loading: boolean;
  products: Product[];
  ratingStats?: Record<number, { averageRating: number; totalRatings: number }>;
  onOpen: (p: Product) => void;
  onAddToCart: (p: Product) => void;
}) {
  if (loading) {
    return (
      <div className="grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="card skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid">
      {products.map((p) => {
        const img = p.images?.[0];
        const price = Number(p.price);
        return (
          <div key={p.id} className="product-card">
            <button type="button" className="product-media" onClick={() => onOpen(p)}>
              {img ? <img src={img} alt={p.name} loading="lazy" /> : <div className="placeholder">No image</div>}
            </button>
            <div className="product-body">
              <div className="product-name" title={p.name}>
                {p.name}
              </div>
              
              {ratingStats[p.id] && ratingStats[p.id].totalRatings > 0 && (
                <div className="product-rating-small">
                  <span className="stars-mini">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`star-mini ${i < Math.round(ratingStats[p.id].averageRating) ? 'filled' : ''}`}>★</span>
                    ))}
                  </span>
                  <span className="rating-count-mini">({ratingStats[p.id].totalRatings})</span>
                </div>
              )}

              <div className="product-meta">
                <span className="price">{formatMoney(price)}</span>
                <span className={p.stock > 0 ? 'stock ok' : 'stock out'}>
                  {p.stock > 0 ? `Còn ${p.stock}` : 'Hết hàng'}
                </span>
              </div>
              <div className="product-actions">
                <button type="button" className="ghost" onClick={() => onOpen(p)}>
                  Xem
                </button>
                <button type="button" className="primary" disabled={p.stock <= 0} onClick={() => onAddToCart(p)}>
                  Thêm vào giỏ
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {!loading && products.length === 0 ? <div className="empty">Không có sản phẩm phù hợp.</div> : null}
    </div>
  );
}

