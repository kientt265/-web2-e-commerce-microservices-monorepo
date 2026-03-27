import { useMemo, useState } from 'react';
import './App.css';

const AUTH_API_BASE =
  (import.meta as any).env?.VITE_AUTH_API_URL || 'http://localhost:3001';
const PRODUCT_API_BASE =
  (import.meta as any).env?.VITE_PRODUCT_API_URL || 'http://localhost:3002';
const CART_API_BASE =
  (import.meta as any).env?.VITE_CART_API_URL || 'http://localhost:3004';
const ORDER_API_BASE =
  (import.meta as any).env?.VITE_ORDER_API_URL || 'http://localhost:3003';

import type { Product } from './api/product';
import type { OrderItem } from './api/order';
import { AuthModal } from './components/AuthModal';
import { CartModal } from './components/CartModal';
import { ProductGrid } from './components/ProductGrid';
import { ProductModal } from './components/ProductModal';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { OrderModal } from './components/OrderModal';
import { PaymentSuccess } from './components/PaymentSuccess';
import { useAuth } from './hooks/useAuth';
import { useCart } from './hooks/useCart';
import { useOrders } from './hooks/useOrders';
import { useProducts } from './hooks/useProducts';

type Page = 'shop' | 'payment-success';

function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const log = (line: string) => {
    console.log(line);
    setLogs((prev) => [line, ...prev].slice(0, 25));
  };

  const [page, setPage] = useState<Page>('shop');

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const auth = useAuth(AUTH_API_BASE, log);
  const productsState = useProducts(PRODUCT_API_BASE);
  const cart = useCart(CART_API_BASE, auth.cartUserId, log);
  const orders = useOrders(ORDER_API_BASE, auth.cartUserId, log);

  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  // Order modal states
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderModalMode, setOrderModalMode] = useState<'place' | 'history' | 'detail'>('place');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);

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

  // Handle Buy Now - order 1 product directly
  const handleBuyNow = (product: Product) => {
    const item: OrderItem = {
      productId: product.id.toString(),
      quantity: 1,
      price: Number(product.price),
    };
    setOrderItems([item]);
    setOrderTotal(Number(product.price));
    setOrderModalMode('place');
    setOrderModalOpen(true);
    setSelectedProduct(null);
  };

  // Handle checkout from cart
  const handleCheckout = () => {
    const items: OrderItem[] = cart.items.map((cartItem) => ({
      productId: cartItem.product_id.toString(),
      quantity: cartItem.quantity,
      price: Number(cartItem.price_at_added),
    }));
    const total = cart.total;
    setOrderItems(items);
    setOrderTotal(total);
    setOrderModalMode('place');
    setOrderModalOpen(true);
    setCartOpen(false);
  };

  // Handle place order
  const handlePlaceOrder = async (
    items: OrderItem[],
    totalAmount: number,
    shippingAddress: any,
    paymentMethod: 'ONLINE_PAYMENT' | 'CASH_ON_DELIVERY'
  ) => {
    const order = await orders.createOrder(items, totalAmount, shippingAddress, paymentMethod);
    if (order && order.paymentUrl) {
      // Redirect to VNPay for online payment
      window.location.href = order.paymentUrl;
    }
    return order;
  };

  // Handle open order history
  const handleOpenOrders = () => {
    setOrderModalMode('history');
    setOrderModalOpen(true);
  };

  // Handle view order detail
  const handleViewOrderDetail = (order: any) => {
    orders.setCurrentOrder(order);
    setOrderModalMode('detail');
  };

  // Handle back to shop from payment success
  const handleBackToShop = () => {
    setPage('shop');
    orders.setCurrentOrder(null);
  };

  // Handle view order detail from payment success
  const handleViewOrderDetailFromSuccess = () => {
    setPage('shop');
    setOrderModalMode('detail');
    setOrderModalOpen(true);
  };

  // Check payment status
  const handleCheckPaymentStatus = async () => {
    return await orders.refreshCurrentOrder();
  };

  // Render payment success page
  if (page === 'payment-success') {
    return (
      <PaymentSuccess
        order={orders.currentOrder}
        onBackToShop={handleBackToShop}
        onViewOrderDetail={handleViewOrderDetailFromSuccess}
        onCheckPaymentStatus={handleCheckPaymentStatus}
      />
    );
  }

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
        onOpenOrders={handleOpenOrders}
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
              <div className="hero-sub">Chọn sản phẩm và đặt hàng ngay hôm nay.</div>
            </div>
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
        onBuyNow={handleBuyNow}
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
        onCheckout={handleCheckout}
        productById={productsState.productById}
        checkoutEnabled={cart.items.length > 0}
      />

        <OrderModal
        open={orderModalOpen}
        onClose={() => {
          setOrderModalOpen(false);
          setOrderModalMode('place');
        }}
        mode={orderModalMode}
        items={orderItems}
        totalAmount={orderTotal}
        onPlaceOrder={handlePlaceOrder}
        orders={orders.orders}
        currentOrder={orders.currentOrder}
        loading={orders.loading}
        error={orders.error}
        onViewOrderDetail={handleViewOrderDetail}
        onRefreshOrder={() => {
          void orders.refreshCurrentOrder();
        }}
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
