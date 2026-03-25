import { useState, useRef, useEffect } from 'react';

export function Topbar({
  search,
  setSearch,
  cartCount,
  onOpenCart,
  onOpenAuth,
  currentUserEmail,
  onLogout,
  onOpenOrders,
  onNotReady,
}: {
  search: string;
  setSearch: (v: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  currentUserEmail: string | null;
  onLogout: () => void;
  onOpenOrders: () => void;
  onNotReady: (service: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (action: string) => {
    setMenuOpen(false);
    switch (action) {
      case 'cart':
        onOpenCart();
        break;
      case 'orders':
        onOpenOrders();
        break;
      case 'inventory':
        onNotReady('inventory-service');
        console.log('[inventory-service] chưa handle');
        break;
      case 'delivery':
        onNotReady('delivery-service');
        console.log('[delivery-service] chưa handle');
        break;
      case 'ratings':
        onNotReady('rating-service');
        console.log('[rating-service] chưa handle');
        break;
      case 'settings':
        onNotReady('user-settings');
        console.log('[user-settings] chưa handle');
        break;
      case 'profile':
        onNotReady('user-profile');
        console.log('[user-profile] chưa handle');
        break;
    }
  };

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
        {/* Cart button - separate for easy access */}
        <button type="button" className="cart-btn" onClick={onOpenCart}>
          Giỏ hàng <span className="badge">{cartCount}</span>
        </button>

        {/* Dropdown menu for other features */}
        <div className="dropdown" ref={menuRef}>
          <button
            type="button"
            className="ghost menu-trigger"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            Menu ▾
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-section">
                <span className="dropdown-label">Đơn hàng</span>
                <button type="button" className="dropdown-item" onClick={() => handleMenuClick('orders')}>
                  📋 Lịch sử đơn hàng
                </button>
                <button type="button" className="dropdown-item" onClick={() => handleMenuClick('delivery')}>
                  🚚 Theo dõi giao hàng
                </button>
              </div>
              <div className="dropdown-divider" />
              <div className="dropdown-section">
                <span className="dropdown-label">Quản lý</span>
                <button type="button" className="dropdown-item" onClick={() => handleMenuClick('inventory')}>
                  📦 Kho hàng
                </button>
                <button type="button" className="dropdown-item" onClick={() => handleMenuClick('ratings')}>
                  ⭐ Đánh giá
                </button>
              </div>
              <div className="dropdown-divider" />
              <div className="dropdown-section">
                <span className="dropdown-label">Tài khoản</span>
                <button type="button" className="dropdown-item" onClick={() => handleMenuClick('profile')}>
                  👤 Hồ sơ
                </button>
                <button type="button" className="dropdown-item" onClick={() => handleMenuClick('settings')}>
                  ⚙️ Cài đặt
                </button>
              </div>
            </div>
          )}
        </div>

        {currentUserEmail ? (
          <button type="button" className="ghost" onClick={onLogout} title={currentUserEmail}>
            {currentUserEmail}
          </button>
        ) : (
          <button type="button" className="ghost" onClick={onOpenAuth}>
            Đăng nhập / Đăng ký
          </button>
        )}
      </div>
    </header>
  );
}

