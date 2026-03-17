import { type FormEvent, useEffect, useMemo, useState } from 'react';
import './App.css';

const AUTH_API_BASE =
  (import.meta as any).env?.VITE_AUTH_API_URL || 'http://localhost:3001';
const PRODUCT_API_BASE =
  (import.meta as any).env?.VITE_PRODUCT_API_URL || 'http://localhost:3002';

type AuthUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  status: string;
};

type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

async function readJsonSafe(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return await res.json();
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

type Category = {
  id: number;
  name: string;
  description?: string | null;
};

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: string; // Prisma Decimal serialized
  images: string[];
  stock: number;
  category_id?: number | null;
  categories?: Category | null;
};

type CartItem = {
  productId: number;
  name: string;
  price: number;
  image?: string;
  qty: number;
  stock: number;
};

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function App() {
  // Auth (optional)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail] = useState('user1@example.com');
  const [password, setPassword] = useState('password123');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Shop state
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Cart (local only)
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem('auth_access_token');
    if (stored) {
      setAccessToken(stored);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setShopLoading(true);
      setShopError(null);
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch(`${PRODUCT_API_BASE}/categories`),
          fetch(`${PRODUCT_API_BASE}/products?limit=24&sort=newest`),
        ]);
        const catJson = await readJsonSafe(catRes);
        const prodJson = await readJsonSafe(prodRes);

        if (!catRes.ok) throw new Error(catJson?.error || 'Failed to load categories');
        if (!prodRes.ok) throw new Error(prodJson?.error || 'Failed to load products');
        if (cancelled) return;
        setCategories(Array.isArray(catJson?.items) ? catJson.items : []);
        setProducts(Array.isArray(prodJson?.items) ? prodJson.items : []);
      } catch (err: any) {
        if (!cancelled) setShopError(err?.message || 'Failed to load shop data');
      } finally {
        if (!cancelled) setShopLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`${AUTH_API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await readJsonSafe(res);
      if (!res.ok) {
        setAuthError(data?.error || 'Register failed');
        return;
      }

      setAuthMode('login');
      setLogs((prev) => [`[auth] Registered successfully, please login`, ...prev].slice(0, 20));
    } catch (err) {
      console.error(err);
      setAuthError('Network error while registering');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`${AUTH_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data: LoginResponse | { error?: string } = await readJsonSafe(res);
      if (!res.ok || !('accessToken' in data)) {
        setAuthError((data as any)?.error || 'Login failed');
        return;
      }

      setAccessToken(data.accessToken);
      window.localStorage.setItem('auth_access_token', data.accessToken);
      setCurrentUser(data.user);
      setShowAuth(false);
      setLogs((prev) => [`[auth] Logged in as ${data.user.email}`, ...prev].slice(0, 20));
    } catch (err) {
      console.error(err);
      setAuthError('Network error while logging in');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setAccessToken(null);
    setCurrentUser(null);
    window.localStorage.removeItem('auth_access_token');
    setLogs((prev) => [`[auth] Logged out (local token cleared)`, ...prev].slice(0, 20));
  };

  const logNotReady = (service: string) => {
    const msg = `[${service}] chưa chuẩn bị xong API`;
    console.log(msg);
    setLogs((prev) => [msg, ...prev].slice(0, 20));
  };

  const cartCount = useMemo(
    () => Object.values(cart).reduce((sum, it) => sum + it.qty, 0),
    [cart],
  );
  const cartTotal = useMemo(
    () => Object.values(cart).reduce((sum, it) => sum + it.qty * it.price, 0),
    [cart],
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => {
        if (selectedCategoryId !== 'all' && (p.category_id ?? null) !== selectedCategoryId) return false;
        if (inStockOnly && p.stock <= 0) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const ap = Number(a.price);
        const bp = Number(b.price);
        if (sort === 'price_asc') return ap - bp;
        if (sort === 'price_desc') return bp - ap;
        return b.id - a.id;
      });
  }, [products, search, selectedCategoryId, inStockOnly, sort]);

  const addToCart = (p: Product) => {
    if (p.stock <= 0) return;
    setCart((prev) => {
      const existing = prev[p.id];
      const nextQty = Math.min((existing?.qty ?? 0) + 1, p.stock);
      return {
        ...prev,
        [p.id]: {
          productId: p.id,
          name: p.name,
          price: Number(p.price),
          image: p.images?.[0],
          qty: nextQty,
          stock: p.stock,
        },
      };
    });
    setLogs((prev) => [`[cart] Added: ${p.name}`, ...prev].slice(0, 20));
  };

  const setQty = (productId: number, qty: number) => {
    setCart((prev) => {
      const it = prev[productId];
      if (!it) return prev;
      const next = Math.max(1, Math.min(qty, it.stock));
      return { ...prev, [productId]: { ...it, qty: next } };
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div className="shop-page">
      <header className="topbar">
        <div className="brand">
          <div className="logo">M</div>
          <div>
            <div className="brand-name">MikeyMart</div>
            <div className="brand-sub">Sàn thương mại điện tử (demo)</div>
          </div>
        </div>

        <div className="search">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
          />
        </div>

        <div className="top-actions">
          <button type="button" className="ghost" onClick={() => logNotReady('order-service')}>
            Orders
          </button>
          <button type="button" className="ghost" onClick={() => logNotReady('inventory-service')}>
            Inventory
          </button>
          <button type="button" className="ghost" onClick={() => logNotReady('delivery-service')}>
            Delivery
          </button>
          <button type="button" className="ghost" onClick={() => logNotReady('rating-service')}>
            Ratings
          </button>

          {currentUser ? (
            <button type="button" className="ghost" onClick={handleLogout} title={currentUser.email}>
              {currentUser.email}
            </button>
          ) : (
            <button type="button" className="ghost" onClick={() => setShowAuth(true)}>
              Đăng nhập / Đăng ký
            </button>
          )}

          <button type="button" className="cart-btn" onClick={() => setCartOpen(true)}>
            Cart <span className="badge">{cartCount}</span>
          </button>
        </div>
      </header>

      <div className="content">
        <aside className="sidebar">
          <div className="side-card">
            <div className="side-title">Danh mục</div>
            <div className="side-list">
              <button
                type="button"
                className={selectedCategoryId === 'all' ? 'active' : ''}
                onClick={() => setSelectedCategoryId('all')}
              >
                Tất cả
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={selectedCategoryId === c.id ? 'active' : ''}
                  onClick={() => setSelectedCategoryId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="side-card">
            <div className="side-title">Bộ lọc</div>
            <label className="check">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              <span>Còn hàng</span>
            </label>
            <label className="field">
              <span>Sắp xếp</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as any)}>
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá tăng</option>
                <option value="price_desc">Giá giảm</option>
              </select>
            </label>

            <div className="side-meta">
              <div className="muted small">Auth API: <code>{AUTH_API_BASE}</code></div>
              <div className="muted small">Product API: <code>{PRODUCT_API_BASE}</code></div>
              <div className="muted small">
                Swagger: <a href={`${PRODUCT_API_BASE}/docs`} target="_blank" rel="noreferrer">/docs</a>
              </div>
            </div>
          </div>

          <div className="side-card">
            <div className="side-title">Logs</div>
            <div className="logs">
              {logs.length === 0 ? (
                <div className="muted small">Chưa có logs.</div>
              ) : (
                logs.map((l, idx) => (
                  <div key={idx} className="log-line">{l}</div>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="hero">
            <div>
              <div className="hero-title">Khám phá sản phẩm</div>
              <div className="hero-sub">
                Xem sản phẩm không cần đăng nhập. Đăng nhập chỉ cần khi đặt hàng (chưa handle).
              </div>
            </div>
            <button type="button" className="primary" onClick={() => logNotReady('order-service')}>
              Mua ngay (chưa handle)
            </button>
          </div>

          {shopError ? (
            <div className="notice error">{shopError}</div>
          ) : null}

          {shopLoading ? (
            <div className="grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="card skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid">
              {filteredProducts.map((p) => {
                const img = p.images?.[0];
                const price = Number(p.price);
                return (
                  <div key={p.id} className="product-card">
                    <button type="button" className="product-media" onClick={() => setSelectedProduct(p)}>
                      {img ? (
                        <img src={img} alt={p.name} loading="lazy" />
                      ) : (
                        <div className="placeholder">No image</div>
                      )}
                    </button>
                    <div className="product-body">
                      <div className="product-name" title={p.name}>{p.name}</div>
                      <div className="product-meta">
                        <span className="price">{formatMoney(price)}</span>
                        <span className={p.stock > 0 ? 'stock ok' : 'stock out'}>
                          {p.stock > 0 ? `Còn ${p.stock}` : 'Hết hàng'}
                        </span>
                      </div>
                      <div className="product-actions">
                        <button type="button" className="ghost" onClick={() => setSelectedProduct(p)}>
                          Xem
                        </button>
                        <button
                          type="button"
                          className="primary"
                          disabled={p.stock <= 0}
                          onClick={() => addToCart(p)}
                        >
                          Thêm vào giỏ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!shopLoading && filteredProducts.length === 0 ? (
                <div className="empty">
                  Không có sản phẩm phù hợp.
                </div>
              ) : null}
            </div>
          )}
        </main>
      </div>

      {selectedProduct ? (
        <div className="modal-backdrop" onMouseDown={() => setSelectedProduct(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">{selectedProduct.name}</div>
                <div className="muted small">
                  {selectedProduct.categories?.name
                    ? `Category: ${selectedProduct.categories.name}`
                    : selectedProduct.category_id
                      ? `Category ID: ${selectedProduct.category_id}`
                      : 'Uncategorized'}
                </div>
              </div>
              <button type="button" className="x" onClick={() => setSelectedProduct(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-media">
                {selectedProduct.images?.[0] ? (
                  <img src={selectedProduct.images[0]} alt={selectedProduct.name} />
                ) : (
                  <div className="placeholder big">No image</div>
                )}
              </div>
              <div className="modal-info">
                <div className="price big">{formatMoney(Number(selectedProduct.price))}</div>
                <div className={selectedProduct.stock > 0 ? 'stock ok' : 'stock out'}>
                  {selectedProduct.stock > 0 ? `Còn ${selectedProduct.stock}` : 'Hết hàng'}
                </div>
                <p className="desc">{selectedProduct.description || 'Không có mô tả.'}</p>
                <div className="modal-actions">
                  <button type="button" className="ghost" onClick={() => logNotReady('rating-service')}>
                    Xem đánh giá (chưa handle)
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={selectedProduct.stock <= 0}
                    onClick={() => addToCart(selectedProduct)}
                  >
                    Thêm vào giỏ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="modal-backdrop" onMouseDown={() => setCartOpen(false)}>
          <div className="modal wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Giỏ hàng</div>
              <button type="button" className="x" onClick={() => setCartOpen(false)}>
                ✕
              </button>
            </div>
            <div className="cart">
              {Object.values(cart).length === 0 ? (
                <div className="muted">Giỏ hàng trống.</div>
              ) : (
                <>
                  <div className="cart-list">
                    {Object.values(cart).map((it) => (
                      <div key={it.productId} className="cart-item">
                        <div className="cart-img">
                          {it.image ? <img src={it.image} alt={it.name} /> : <div className="placeholder">No image</div>}
                        </div>
                        <div className="cart-info">
                          <div className="cart-name">{it.name}</div>
                          <div className="muted small">{formatMoney(it.price)} / item</div>
                          <div className="qty">
                            <button type="button" className="ghost" onClick={() => setQty(it.productId, it.qty - 1)}>
                              −
                            </button>
                            <div className="qty-n">{it.qty}</div>
                            <button type="button" className="ghost" onClick={() => setQty(it.productId, it.qty + 1)}>
                              +
                            </button>
                            <button type="button" className="danger" onClick={() => removeFromCart(it.productId)}>
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="cart-price">{formatMoney(it.qty * it.price)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="cart-footer">
                    <div className="cart-total">
                      <div className="muted small">Tổng cộng</div>
                      <div className="price big">{formatMoney(cartTotal)}</div>
                    </div>
                    <button
                      type="button"
                      className="primary"
                      onClick={() => logNotReady('order-service')}
                    >
                      Checkout (chưa handle)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showAuth ? (
        <div className="modal-backdrop" onMouseDown={() => setShowAuth(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</div>
              <button type="button" className="x" onClick={() => setShowAuth(false)}>
                ✕
              </button>
            </div>

            <div className="tabs">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
              >
                Register
              </button>
            </div>

            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="auth-form">
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>

              {authError ? <div className="notice error">{authError}</div> : null}

              <button type="submit" className="primary" disabled={authLoading}>
                {authLoading ? 'Working...' : authMode === 'login' ? 'Login' : 'Register'}
              </button>
              {accessToken ? (
                <div className="muted small">
                  Token đã lưu localStorage. (Refresh token cookie được set bởi auth-service)
                </div>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
