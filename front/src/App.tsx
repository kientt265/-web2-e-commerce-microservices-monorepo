import { useMemo, useState } from 'react';
import './App.css';

const AUTH_API_BASE =
  (import.meta as any).env?.VITE_AUTH_API_URL || 'http://localhost:3001';
const PRODUCT_API_BASE =
  (import.meta as any).env?.VITE_PRODUCT_API_URL || 'http://localhost:3002';
const CART_API_BASE =
  (import.meta as any).env?.VITE_CART_API_URL || 'http://localhost:3004';

import type { Product } from './api/product';
import { AuthModal } from './components/AuthModal';
import { CartModal } from './components/CartModal';
import { ProductGrid } from './components/ProductGrid';
import { ProductModal } from './components/ProductModal';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { useAuth } from './hooks/useAuth';
import { useCart } from './hooks/useCart';
import { useProducts } from './hooks/useProducts';

function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const log = (line: string) => {
    console.log(line);
    setLogs((prev) => [line, ...prev].slice(0, 25));
  };

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const auth = useAuth(AUTH_API_BASE, log);
  const productsState = useProducts(PRODUCT_API_BASE);
  const cart = useCart(CART_API_BASE, auth.cartUserId, log);

  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return productsState.products
      .filter((p) => {
        if (selectedCategoryId !== 'all' && (p.category_id ?? null) !== selectedCategoryId) return false;
        if (inStockOnly && p.stock <= 0) return false;
        if (!q) return true;
        return p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const ap = Number(a.price);
        const bp = Number(b.price);
        if (sort === 'price_asc') return ap - bp;
        if (sort === 'price_desc') return bp - ap;
        return b.id - a.id;
      });
  }, [productsState.products, search, selectedCategoryId, inStockOnly, sort]);

  const notReady = (service: string) => log(`[${service}] chưa chuẩn bị xong API`);

  return (
    <div className="shop-page">
      <Topbar
        search={search}
        setSearch={setSearch}
        cartCount={cart.count}
        onOpenCart={() => {
          setCartOpen(true);
          void cart.refresh();
        }}
        onOpenAuth={() => setAuthOpen(true)}
        currentUserEmail={auth.currentUser?.email ?? null}
        onLogout={auth.logout}
        onNotReady={notReady}
      />

      <div className="content">
        <Sidebar
          categories={productsState.categories}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          inStockOnly={inStockOnly}
          setInStockOnly={setInStockOnly}
          sort={sort}
          setSort={setSort}
          authBaseUrl={AUTH_API_BASE}
          productBaseUrl={PRODUCT_API_BASE}
          cartBaseUrl={CART_API_BASE}
          logs={logs}
        />

        <main className="main">
          <div className="hero">
            <div>
              <div className="hero-title">Khám phá sản phẩm</div>
              <div className="hero-sub">Xem sản phẩm không cần đăng nhập. Đặt hàng sẽ handle sau.</div>
            </div>
            <button type="button" className="primary" onClick={() => notReady('order-service')}>
              Mua ngay (chưa handle)
            </button>
          </div>

          {productsState.error ? <div className="notice error">{productsState.error}</div> : null}

          <ProductGrid
            loading={productsState.loading}
            products={filteredProducts}
            onOpen={(p) => setSelectedProduct(p)}
            onAddToCart={(p) => void cart.addItem(p, 1)}
          />
        </main>
      </div>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(p) => void cart.addItem(p, 1)}
        onNotReady={notReady}
      />

      <CartModal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart.items}
        loading={cart.loading}
        error={cart.error}
        total={cart.total}
        onInc={(itemId, qty) => void cart.updateQty(itemId, qty + 1)}
        onDec={(itemId, qty) => void cart.updateQty(itemId, Math.max(1, qty - 1))}
        onRemove={(itemId) => void cart.removeItem(itemId)}
        onClear={() => void cart.clear()}
        onCheckoutNotReady={() => notReady('order-service')}
        productById={productsState.productById}
      />

      <AuthModal
        open={authOpen}
        mode={authMode}
        setMode={(m) => {
          auth.setError(null);
          setAuthMode(m);
        }}
        onClose={() => setAuthOpen(false)}
        onLogin={auth.login}
        onRegister={auth.register}
        loading={auth.loading}
        error={auth.error}
      />
    </div>
  );
}

export default App;
