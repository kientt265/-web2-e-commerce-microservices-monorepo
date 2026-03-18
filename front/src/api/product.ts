import { fetchJson } from './http';

export type Category = {
  id: number;
  name: string;
  description?: string | null;
};

export type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: string;
  images: string[];
  stock: number;
  category_id?: number | null;
  categories?: Category | null;
};

export type ListProductsQuery = {
  search?: string;
  categoryId?: number;
  inStockOnly?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  limit?: number;
};

export async function listCategories(baseUrl: string) {
  return await fetchJson<{ items: Category[] }>(`${baseUrl}/categories`);
}

export async function listProducts(baseUrl: string, q: ListProductsQuery) {
  const params = new URLSearchParams();
  if (q.search) params.set('search', q.search);
  if (q.categoryId) params.set('categoryId', String(q.categoryId));
  if (q.inStockOnly) params.set('inStockOnly', 'true');
  if (q.sort) params.set('sort', q.sort);
  if (q.limit) params.set('limit', String(q.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';

  return await fetchJson<{
    items: Product[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>(`${baseUrl}/products${qs}`);
}

