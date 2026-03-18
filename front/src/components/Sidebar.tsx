import type { Category } from '../api/product';
import { LogsPanel } from './LogsPanel';

export function Sidebar({
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  inStockOnly,
  setInStockOnly,
  sort,
  setSort,
  authBaseUrl,
  productBaseUrl,
  cartBaseUrl,
  logs,
}: {
  categories: Category[];
  selectedCategoryId: number | 'all';
  setSelectedCategoryId: (v: number | 'all') => void;
  inStockOnly: boolean;
  setInStockOnly: (v: boolean) => void;
  sort: 'newest' | 'price_asc' | 'price_desc';
  setSort: (v: 'newest' | 'price_asc' | 'price_desc') => void;
  authBaseUrl: string;
  productBaseUrl: string;
  cartBaseUrl: string;
  logs: string[];
}) {
  return (
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
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
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
          <div className="muted small">
            Auth API: <code>{authBaseUrl}</code>
          </div>
          <div className="muted small">
            Product API: <code>{productBaseUrl}</code>
          </div>
          <div className="muted small">
            Cart API: <code>{cartBaseUrl}</code>
          </div>
          <div className="muted small">
            Swagger:{" "}
            <a href={`${productBaseUrl}/docs`} target="_blank" rel="noreferrer">
              product
            </a>{" "}
            /{" "}
            <a href={`${cartBaseUrl}/docs`} target="_blank" rel="noreferrer">
              cart
            </a>
          </div>
        </div>
      </div>

      <LogsPanel logs={logs} />
    </aside>
  );
}

