export function Topbar({
  search,
  setSearch,
  cartCount,
  onOpenCart,
  onOpenAuth,
  currentUserEmail,
  onLogout,
  onNotReady,
}: {
  search: string;
  setSearch: (v: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  currentUserEmail: string | null;
  onLogout: () => void;
  onNotReady: (service: string) => void;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo">M</div>
        <div>
          <div className="brand-name">MikeyMart</div>
          <div className="brand-sub">Sàn thương mại điện tử (demo)</div>
        </div>
      </div>

      <div className="search">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm sản phẩm..." />
      </div>

      <div className="top-actions">
        <button type="button" className="ghost" onClick={() => onNotReady('order-service')}>
          Orders
        </button>
        <button type="button" className="ghost" onClick={() => onNotReady('inventory-service')}>
          Inventory
        </button>
        <button type="button" className="ghost" onClick={() => onNotReady('delivery-service')}>
          Delivery
        </button>
        <button type="button" className="ghost" onClick={() => onNotReady('rating-service')}>
          Ratings
        </button>

        {currentUserEmail ? (
          <button type="button" className="ghost" onClick={onLogout} title={currentUserEmail}>
            {currentUserEmail}
          </button>
        ) : (
          <button type="button" className="ghost" onClick={onOpenAuth}>
            Đăng nhập / Đăng ký
          </button>
        )}

        <button type="button" className="cart-btn" onClick={onOpenCart}>
          Cart <span className="badge">{cartCount}</span>
        </button>
      </div>
    </header>
  );
}

