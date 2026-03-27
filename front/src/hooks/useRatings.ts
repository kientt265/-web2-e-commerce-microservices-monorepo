import { useCallback, useState } from 'react';
import * as ratingApi from '../api/rating';
import type { Rating, RatingsResponse, CreateRatingPayload, UpdateRatingPayload } from '../api/rating';

export type RatingStats = {
  averageRating: number;
  totalRatings: number;
};

export function useRatings(ratingBaseUrl: string, userId?: string) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<RatingStats>({ averageRating: 0, totalRatings: 0 });
  const [bulkStats, setBulkStats] = useState<Record<number, { averageRating: number; totalRatings: number }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchRatings = useCallback(async (productId: number, page: number = 1) => {
    setLoading(true);
    setError(null);

    const response = await ratingApi.getProductRatings(ratingBaseUrl, productId, userId, page, 10);

    if (!response.ok) {
      setError(response.error || 'Failed to fetch ratings');
      setLoading(false);
      return;
    }

    const data = response.data as RatingsResponse;
    setRatings(data.ratings);
    setStats(data.stats);
    setPagination({
      page: data.pagination.page,
      totalPages: data.pagination.totalPages,
      total: data.pagination.total,
    });
    setLoading(false);
  }, [ratingBaseUrl, userId]);

  const fetchBulkStats = useCallback(async (productIds: number[]) => {
    if (productIds.length === 0) return;
    const response = await ratingApi.getBulkStats(ratingBaseUrl, productIds);
    if (response.ok) {
      setBulkStats((prev) => ({ ...prev, ...response.data }));
    }
  }, [ratingBaseUrl]);

  const createRating = useCallback(async (productId: number, payload: CreateRatingPayload) => {
    if (!userId) {
      setError('You must be logged in to rate');
      return { ok: false, error: 'You must be logged in to rate' };
    }

    setLoading(true);
    setError(null);

    const response = await ratingApi.createRating(ratingBaseUrl, productId, payload, userId);

    if (!response.ok) {
      setError(response.error || 'Failed to create rating');
      setLoading(false);
      return response;
    }

    await Promise.all([
      fetchRatings(productId),
      fetchBulkStats([productId]),
    ]);
    return response;
  }, [ratingBaseUrl, userId, fetchRatings, fetchBulkStats]);

  const updateRating = useCallback(async (ratingId: number, payload: UpdateRatingPayload, productId: number) => {
    if (!userId) {
      setError('You must be logged in to update rating');
      return { ok: false, error: 'You must be logged in to update rating' };
    }

    setLoading(true);
    setError(null);

    const response = await ratingApi.updateRating(ratingBaseUrl, ratingId, payload, userId);

    if (!response.ok) {
      setError(response.error || 'Failed to update rating');
      setLoading(false);
      return response;
    }

    await Promise.all([
      fetchRatings(productId),
      fetchBulkStats([productId]),
    ]);
    return response;
  }, [ratingBaseUrl, userId, fetchRatings, fetchBulkStats]);

  const deleteRating = useCallback(async (ratingId: number, productId: number) => {
    if (!userId) {
      setError('You must be logged in to delete rating');
      return { ok: false, error: 'You must be logged in to delete rating' };
    }

    setLoading(true);
    setError(null);

    const response = await ratingApi.deleteRating(ratingBaseUrl, ratingId, userId);

    if (!response.ok) {
      setError(response.error || 'Failed to delete rating');
      setLoading(false);
      return response;
    }

    await Promise.all([
      fetchRatings(productId),
      fetchBulkStats([productId]),
    ]);
    return response;
  }, [ratingBaseUrl, userId, fetchRatings, fetchBulkStats]);

  const toggleHelpful = useCallback(async (ratingId: number, productId: number) => {
    if (!userId) {
      setError('You must be logged in to vote');
      return { ok: false, error: 'You must be logged in to vote' };
    }

    const response = await ratingApi.toggleHelpfulVote(ratingBaseUrl, ratingId, userId);

    if (!response.ok) {
      setError(response.error || 'Failed to toggle helpful vote');
      return response;
    }

    await fetchRatings(productId);
    return response;
  }, [ratingBaseUrl, userId, fetchRatings]);

  const reportRating = useCallback(async (ratingId: number, _productId: number) => {
    if (!userId) {
      setError('You must be logged in to report');
      return { ok: false, error: 'You must be logged in to report' };
    }

    const response = await ratingApi.reportRating(ratingBaseUrl, ratingId, userId);

    if (!response.ok) {
      setError(response.error || 'Failed to report rating');
      return response;
    }

    return response;
  }, [ratingBaseUrl, userId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearRatings = useCallback(() => {
    setRatings([]);
    setStats({ averageRating: 0, totalRatings: 0 });
    setPagination({ page: 1, totalPages: 1, total: 0 });
  }, []);

  return {
    ratings,
    stats,
    bulkStats,
    pagination,
    loading,
    error,
    fetchRatings,
    fetchBulkStats,
    createRating,
    updateRating,
    deleteRating,
    toggleHelpful,
    reportRating,
    clearError,
    clearRatings,
    fetchEligibilities: async () => {
      if (!userId) {
        setError('You must be logged in to fetch eligibilities');
        return { ok: false, error: 'You must be logged in' };
      }
      setLoading(true);
      setError(null);
      const response = await ratingApi.getUserEligibilities(ratingBaseUrl, userId);
      if (!response.ok) {
        setError(response.error || 'Failed to fetch eligibilities');
        setLoading(false);
        return response;
      }
      setLoading(false);
      return response;
    },
  };
}