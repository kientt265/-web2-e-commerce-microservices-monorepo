import type { Product } from '../api/product';
import type { CartItem } from '../api/cart';
import { formatMoney } from '../utils/money';

export function CartModal({
  open,
  onClose,
  items,
  loading,
  error,
  total,
  onInc,
  onDec,
  onRemove,
  onClear,
  onCheckoutNotReady,
  productById,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  loading: boolean;
  error: string | null;
  total: number;
  onInc: (itemId: number, currentQty: number) => void;
  onDec: (itemId: number, currentQty: number) => void;
  onRemove: (itemId: number) => void;
  onClear: () => void;
  onCheckoutNotReady: () => void;
  productById: Map<number, Product>;
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal wide" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Giỏ hàng</div>
          <button type="button" className="x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="cart">
          {error ? <div className="notice error">{error}</div> : null}

          {items.length === 0 ? (
            <div className="muted">Giỏ hàng trống.</div>
          ) : (
            <>
              <div className="cart-list">
                {items.map((it) => {
                  const p = productById.get(it.product_id);
                  const img = p?.images?.[0];
                  const name = p?.name ?? `Product #${it.product_id}`;
                  return (
                    <div key={it.id} className="cart-item">
                      <div className="cart-img">
                        {img ? <img src={img} alt={name} /> : <div className="placeholder">No image</div>}
                      </div>
                      <div className="cart-info">
                        <div className="cart-name">{name}</div>
                        <div className="muted small">{formatMoney(Number(it.price_at_added))} / item</div>
                        <div className="qty">
                          <button type="button" className="ghost" disabled={loading} onClick={() => onDec(it.id, it.quantity)}>
                            −
                          </button>
                          <div className="qty-n">{it.quantity}</div>
                          <button type="button" className="ghost" disabled={loading} onClick={() => onInc(it.id, it.quantity)}>
                            +
                          </button>
                          <button type="button" className="danger" disabled={loading} onClick={() => onRemove(it.id)}>
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="cart-price">{formatMoney(it.quantity * Number(it.price_at_added))}</div>
                    </div>
                  );
                })}
              </div>

              <div className="cart-footer">
                <div className="cart-total">
                  <div className="muted small">Tổng cộng</div>
                  <div className="price big">{formatMoney(total)}</div>
                </div>
                <div className="qty" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="danger" disabled={loading} onClick={onClear}>
                    Clear
                  </button>
                  <button type="button" className="primary" disabled={loading} onClick={onCheckoutNotReady}>
                    Checkout (chưa handle)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

