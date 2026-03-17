import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function listCategories(_req: Request, res: Response) {
  try {
    const categories = await prisma.categories.findMany({
      orderBy: { created_at: 'desc' },
    });
    return res.status(200).json({ items: categories });
  } catch (err) {
    console.error('listCategories error:', err);
    return res.status(500).json({ error: 'Failed to list categories' });
  }
}

export async function getCategoryById(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid category id' });

  try {
    const category = await prisma.categories.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    return res.status(200).json(category);
  } catch (err) {
    console.error('getCategoryById error:', err);
    return res.status(500).json({ error: 'Failed to fetch category' });
  }
}

export async function createCategory(req: Request, res: Response) {
  const { name, description } = req.body as { name?: string; description?: string };
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  try {
    const created = await prisma.categories.create({
      data: {
        name: name.trim(),
        description: description?.trim() ? description.trim() : null,
      },
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error('createCategory error:', err);
    return res.status(500).json({ error: 'Failed to create category' });
  }
}

export async function updateCategory(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid category id' });

  const { name, description } = req.body as { name?: string; description?: string | null };
  if (name !== undefined && !name.trim()) return res.status(400).json({ error: 'name cannot be empty' });

  try {
    const updated = await prisma.categories.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() ? description.trim() : null } : {}),
      },
    });
    return res.status(200).json(updated);
  } catch (err: any) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    console.error('updateCategory error:', err);
    return res.status(500).json({ error: 'Failed to update category' });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid category id' });

  try {
    await prisma.categories.delete({ where: { id } });
    return res.status(204).send();
  } catch (err: any) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    console.error('deleteCategory error:', err);
    return res.status(500).json({ error: 'Failed to delete category' });
  }
}

