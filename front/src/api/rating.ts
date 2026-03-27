import { fetchJson } from './http';

export type Rating = {
  id: number;
  product_id: number;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  is_anonymous: boolean;
  is_published: boolean;
  reported: boolean;
  order_id: number | null;
  created_at: string;
  updated_at: string;
  helpful_votes: HelpfulVote[];
};

export type HelpfulVote = {
  id: number;
  rating_id: number;
  user_id: string;
  is_helpful: boolean;
  created_at: string;
};

export type RatingsResponse = {
  ratings: Rating[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    averageRating: number;
    totalRatings: number;
  };
};

export type CreateRatingPayload = {
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  is_anonymous?: boolean;
  order_id?: number;
};

export type UpdateRatingPayload = {
  rating?: number;
  title?: string;
  comment?: string;
  images?: string[];
  is_anonymous?: boolean;
};

const getHeaders = (userId?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userId) {
    headers['x-user-id'] = userId;
  }
  return headers;
};

export async function getProductRatings(
  baseUrl: string,
  productId: number,
  userId?: string,
  page: number = 1,
  limit: number = 10
) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  const qs = params.toString() ? `?${params.toString()}` : '';

  return await fetchJson<RatingsResponse>(
    `${baseUrl}/products/${productId}/ratings${qs}`,
    {
      headers: getHeaders(userId),
    }
  );
}

export async function getBulkStats(baseUrl: string, productIds: number[]) {
  return await fetchJson<Record<number, { averageRating: number; totalRatings: number }>>(
    `${baseUrl}/stats/bulk?productIds=${productIds.join(',')}`
  );
}

export async function createRating(
  baseUrl: string,
  productId: number,
  payload: CreateRatingPayload,
  userId: string
) {
  return await fetchJson<Rating>(
    `${baseUrl}/products/${productId}/ratings`,
    {
      method: 'POST',
      headers: getHeaders(userId),
      body: JSON.stringify(payload),
    }
  );
}

export async function updateRating(
  baseUrl: string,
  ratingId: number,
  payload: UpdateRatingPayload,
  userId: string
) {
  return await fetchJson<Rating>(
    `${baseUrl}/ratings/${ratingId}`,
    {
      method: 'PUT',
      headers: getHeaders(userId),
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteRating(baseUrl: string, ratingId: number, userId: string) {
  return await fetchJson<void>(
    `${baseUrl}/ratings/${ratingId}`,
    {
      method: 'DELETE',
      headers: getHeaders(userId),
    }
  );
}

export async function toggleHelpfulVote(baseUrl: string, ratingId: number, userId: string) {
  return await fetchJson<HelpfulVote>(
    `${baseUrl}/ratings/${ratingId}/helpful`,
    {
      method: 'POST',
      headers: getHeaders(userId),
    }
  );
}

export async function reportRating(baseUrl: string, ratingId: number, userId: string) {
  return await fetchJson<void>(
    `${baseUrl}/ratings/${ratingId}/report`,
    {
      method: 'POST',
      headers: getHeaders(userId),
    }
  );
}

export type RatingEligibility = {
  id: number;
  user_id: string;
  order_id: number;
  product_id: number;
  delivery_id: number | null;
  delivered_at: string | null;
  created_at: string;
  hasRated: boolean;
  ratingId: number | null;
};

export type EligibilitiesResponse = {
  eligibilities: RatingEligibility[];
};

export type EligibilityCheckResponse = {
  eligible: boolean;
  reason?: string;
  orderId?: number;
  deliveryId?: number;
  ratingId?: number;
};

export async function getUserEligibilities(baseUrl: string, userId: string) {
  return await fetchJson<EligibilitiesResponse>(
    `${baseUrl}/users/eligibilities`,
    {
      headers: getHeaders(userId),
    }
  );
}

export async function checkEligibility(baseUrl: string, productId: number, userId: string) {
  return await fetchJson<EligibilityCheckResponse>(
    `${baseUrl}/eligibilities/${productId}/check`,
    {
      headers: getHeaders(userId),
    }
  );
}

export async function getUserRatings(baseUrl: string, userId: string) {
  return await fetchJson<Rating[]>(
    `${baseUrl}/users/ratings`,
    {
      headers: getHeaders(userId),
    }
  );
}