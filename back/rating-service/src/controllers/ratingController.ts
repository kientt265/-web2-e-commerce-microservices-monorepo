import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getRatingsByProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      prisma.product_ratings.findMany({
        where: { product_id: parseInt(productId), is_published: true },
        include: {
          helpful_votes: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product_ratings.count({
        where: { product_id: parseInt(productId), is_published: true },
      }),
    ]);

    const averageRating = await prisma.product_ratings.aggregate({
      where: { product_id: parseInt(productId), is_published: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    res.json({
      ratings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        averageRating: averageRating._avg.rating || 0,
        totalRatings: averageRating._count.rating,
      },
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
};

export const createRating = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment, images, is_anonymous, order_id } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const existingRating = await prisma.product_ratings.findFirst({
      where: {
        product_id: parseInt(productId),
        user_id: userId,
        order_id: order_id ? parseInt(order_id) : null,
      },
    });

    if (existingRating) {
      return res.status(400).json({ error: 'You have already rated this product' });
    }

    const newRating = await prisma.product_ratings.create({
      data: {
        product_id: parseInt(productId),
        user_id: userId,
        rating,
        title,
        comment,
        images: images || [],
        is_anonymous: is_anonymous || false,
        order_id: order_id ? parseInt(order_id) : null,
      },
      include: {
        helpful_votes: true,
      },
    });

    res.status(201).json(newRating);
  } catch (error) {
    console.error('Error creating rating:', error);
    res.status(500).json({ error: 'Failed to create rating' });
  }
};

export const updateRating = async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params;
    const { rating, title, comment, images, is_anonymous } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const existingRating = await prisma.product_ratings.findFirst({
      where: { id: parseInt(ratingId), user_id: userId },
    });

    if (!existingRating) {
      return res.status(404).json({ error: 'Rating not found or unauthorized' });
    }

    const updatedRating = await prisma.product_ratings.update({
      where: { id: parseInt(ratingId) },
      data: {
        rating: rating !== undefined ? rating : existingRating.rating,
        title: title !== undefined ? title : existingRating.title,
        comment: comment !== undefined ? comment : existingRating.comment,
        images: images !== undefined ? images : existingRating.images,
        is_anonymous: is_anonymous !== undefined ? is_anonymous : existingRating.is_anonymous,
      },
      include: {
        helpful_votes: true,
      },
    });

    res.json(updatedRating);
  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({ error: 'Failed to update rating' });
  }
};

export const deleteRating = async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const existingRating = await prisma.product_ratings.findFirst({
      where: { id: parseInt(ratingId), user_id: userId },
    });

    if (!existingRating) {
      return res.status(404).json({ error: 'Rating not found or unauthorized' });
    }

    await prisma.product_ratings.delete({
      where: { id: parseInt(ratingId) },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
};

export const getUserRatings = async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      prisma.product_ratings.findMany({
        where: { user_id: userId },
        include: {
          helpful_votes: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product_ratings.count({
        where: { user_id: userId },
      }),
    ]);

    res.json({
      ratings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching user ratings:', error);
    res.status(500).json({ error: 'Failed to fetch user ratings' });
  }
};

export const toggleHelpfulVote = async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const existingVote = await prisma.rating_helpful_votes.findFirst({
      where: { rating_id: parseInt(ratingId), user_id: userId },
    });

    if (existingVote) {
      await prisma.rating_helpful_votes.delete({
        where: { id: existingVote.id },
      });
      res.json({ message: 'Vote removed', isHelpful: false });
    } else {
      await prisma.rating_helpful_votes.create({
        data: {
          rating_id: parseInt(ratingId),
          user_id: userId,
          is_helpful: true,
        },
      });
      res.json({ message: 'Vote added', isHelpful: true });
    }
  } catch (error) {
    console.error('Error toggling helpful vote:', error);
    res.status(500).json({ error: 'Failed to toggle helpful vote' });
  }
};

export const reportRating = async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const rating = await prisma.product_ratings.findFirst({
      where: { id: parseInt(ratingId) },
    });

    if (!rating) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    await prisma.product_ratings.update({
      where: { id: parseInt(ratingId) },
      data: { reported: true },
    });

    res.json({ message: 'Rating reported successfully' });
  } catch (error) {
    console.error('Error reporting rating:', error);
    res.status(500).json({ error: 'Failed to report rating' });
  }
};
