import { useEffect, useMemo, useState } from 'react';
import type { Category, Product } from '../api/product';
import * as productApi from '../api/product';

export function useProducts(productBaseUrl: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const [cats, prods] = await Promise.all([
        productApi.listCategories(productBaseUrl),
        productApi.listProducts(productBaseUrl, { limit: 48, sort: 'newest' }),
      ]);

      if (cancelled) return;
      if (!cats.ok) {
        setError(cats.error);
        setLoading(false);
        return;
      }
      if (!prods.ok) {
        setError(prods.error);
        setLoading(false);
        return;
      }

      setCategories(cats.data.items ?? []);
      setProducts(prods.data.items ?? []);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [productBaseUrl]);

  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  return { categories, products, productById, loading, error };
}

