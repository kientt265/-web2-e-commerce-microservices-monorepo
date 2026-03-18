import type { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseOptionalInt(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

function parseOptionalDecimal(raw: unknown): Prisma.Decimal | null {
  if (raw === undefined || raw === null || raw === '') return null;
  try {
    // Accept number or string
    return new Prisma.Decimal(raw as any);
  } catch {
    return null;
  }
}

function parsePagination(query: Request['query']) {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export async function listProducts(req: Request, res: Response) {
  const { page, limit, skip } = parsePagination(req.query);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const categoryId = parseOptionalInt(req.query.categoryId);
  const minPrice = parseOptionalDecimal(req.query.minPrice);
  const maxPrice = parseOptionalDecimal(req.query.maxPrice);
  const inStockOnly = String(req.query.inStockOnly ?? '').toLowerCase() === 'true';

  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';

  const where: Prisma.productsWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(categoryId !== null ? { category_id: categoryId } : {}),
    ...(minPrice || maxPrice
      ? {
          price: {
            ...(minPrice ? { gte: minPrice } : {}),
            ...(maxPrice ? { lte: maxPrice } : {}),
          },
        }
      : {}),
    ...(inStockOnly ? { stock: { gt: 0 } } : {}),
  };

  const orderBy: Prisma.productsOrderByWithRelationInput =
    sort === 'price_asc'
      ? { price: 'asc' }
      : sort === 'price_desc'
        ? { price: 'desc' }
        : { created_at: 'desc' };

  try {
    const [items, total] = await Promise.all([
      prisma.products.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { categories: true },
      }),
      prisma.products.count({ where }),
    ]);

    return res.status(200).json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('listProducts error:', err);
    return res.status(500).json({ error: 'Failed to list products' });
  }
}

export async function getProductById(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid product id' });

  try {
    const product = await prisma.products.findUnique({
      where: { id },
      include: { categories: true },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.status(200).json(product);
  } catch (err) {
    console.error('getProductById error:', err);
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
}

export async function createProduct(req: Request, res: Response) {
  const body = req.body as {
    name?: string;
    description?: string | null;
    price?: string | number;
    categoryId?: number | string | null;
    images?: unknown;
    stock?: number | string;
  };

  const name = body.name?.trim();
  if (!name) return res.status(400).json({ error: 'name is required' });

  const price = parseOptionalDecimal(body.price);
  if (!price) return res.status(400).json({ error: 'price is required and must be a valid decimal' });

  const categoryId = body.categoryId !== undefined ? parseOptionalInt(body.categoryId) : null;
  if (body.categoryId !== undefined && body.categoryId !== null && categoryId === null) {
    return res.status(400).json({ error: 'categoryId must be an integer' });
  }

  const images =
    Array.isArray(body.images) ? body.images.filter((x) => typeof x === 'string') : undefined;
  if (body.images !== undefined && !Array.isArray(body.images)) {
    return res.status(400).json({ error: 'images must be an array of strings' });
  }

  const stockRaw = body.stock ?? 0;
  const stock = Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ error: 'stock must be a non-negative integer' });

  try {
    if (categoryId !== null) {
      const exists = await prisma.categories.findUnique({ where: { id: categoryId } });
      if (!exists) return res.status(400).json({ error: 'categoryId does not exist' });
    }

    const created = await prisma.products.create({
      data: {
        name,
        description: body.description?.trim() ? body.description.trim() : null,
        price,
        category_id: categoryId,
        images: images ?? [],
        stock,
      },
      include: { categories: true },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error('createProduct error:', err);
    return res.status(500).json({ error: 'Failed to create product' });
  }
}

export async function updateProduct(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid product id' });

  const body = req.body as {
    name?: string;
    description?: string | null;
    price?: string | number;
    categoryId?: number | string | null;
    images?: unknown;
    stock?: number | string;
  };

  const data: Prisma.productsUpdateInput = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return res.status(400).json({ error: 'name cannot be empty' });
    data.name = name;
  }

  if (body.description !== undefined) {
    data.description = body.description?.trim() ? body.description.trim() : null;
  }

  if (body.price !== undefined) {
    const price = parseOptionalDecimal(body.price);
    if (!price) return res.status(400).json({ error: 'price must be a valid decimal' });
    data.price = price;
  }

  if (body.stock !== undefined) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ error: 'stock must be a non-negative integer' });
    data.stock = stock;
  }

  if (body.images !== undefined) {
    if (!Array.isArray(body.images)) return res.status(400).json({ error: 'images must be an array of strings' });
    const images = body.images.filter((x) => typeof x === 'string') as string[];
    data.images = images;
  }

  if (body.categoryId !== undefined) {
    if (body.categoryId === null) {
      data.category_id = null;
    } else {
      const categoryId = parseOptionalInt(body.categoryId);
      if (categoryId === null) return res.status(400).json({ error: 'categoryId must be an integer' });
      const exists = await prisma.categories.findUnique({ where: { id: categoryId } });
      if (!exists) return res.status(400).json({ error: 'categoryId does not exist' });
      data.category_id = categoryId;
    }
  }

  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No fields to update' });

  try {
    const updated = await prisma.products.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
      include: { categories: true },
    });
    return res.status(200).json(updated);
  } catch (err: any) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    console.error('updateProduct error:', err);
    return res.status(500).json({ error: 'Failed to update product' });
  }
}

export async function deleteProduct(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid product id' });

  try {
    await prisma.products.delete({ where: { id } });
    return res.status(204).send();
  } catch (err: any) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    console.error('deleteProduct error:', err);
    return res.status(500).json({ error: 'Failed to delete product' });
  }
}

