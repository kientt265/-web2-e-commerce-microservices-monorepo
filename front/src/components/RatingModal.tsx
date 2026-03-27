import { useEffect, useState } from 'react';
import type { Product } from '../api/product';
import type { Rating } from '../api/rating';
import { useRatings } from '../hooks/useRatings';

type RatingModalProps = {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  productId: number;
  orderId?: number;
  userId?: string;
  ratingBaseUrl: string;
};

export function RatingModal({
  open,
  onClose,
  product,
  productId,
  orderId,
  userId,
  ratingBaseUrl,
}: RatingModalProps) {
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const {
    ratings,
    stats,
    pagination,
    loading,
    error,
    fetchRatings,
    createRating,
    updateRating,
    deleteRating,
    toggleHelpful,
    reportRating,
    clearError,
    clearRatings,
  } = useRatings(ratingBaseUrl, userId);

  useEffect(() => {
    if (open && productId) {
      void fetchRatings(productId);
      setSelectedRating(null);
      setIsCreating(false);
      setNewRating(5);
      setNewTitle('');
      setNewComment('');
      setIsAnonymous(false);
      clearError();
      if (orderId && orderId > 0) {
        setIsCreating(true);
      }
    }
  }, [open, productId, orderId, fetchRatings, clearError]);

  useEffect(() => {
    if (!open) {
      clearRatings();
    }
  }, [open, clearRatings]);

  const handleCreateRating = async () => {
    if (!product) return;
    const result = await createRating(product.id, {
      rating: newRating,
      title: newTitle || undefined,
      comment: newComment || undefined,
      is_anonymous: isAnonymous ? true : false,
      order_id: orderId,
    });
    if (result.ok) {
      setIsCreating(false);
      setNewRating(5);
      setNewTitle('');
      setNewComment('');
      setIsAnonymous(false);
    }
  };

  const handleUpdateRating = async () => {
    if (!selectedRating || !product) return;
    const result = await updateRating(selectedRating.id, {
      rating: newRating,
      title: newTitle || undefined,
      comment: newComment || undefined,
      is_anonymous: isAnonymous ? true : false,
    }, product.id);
    if (result.ok) {
      setSelectedRating(null);
      setIsCreating(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!selectedRating || !product) return;
    if (!confirm('Are you sure you want to delete this rating?')) return;
    await deleteRating(selectedRating.id, product.id);
    setSelectedRating(null);
    setIsCreating(false);
  };

  const handleToggleHelpful = async (rating: Rating) => {
    if (!product) return;
    await toggleHelpful(rating.id, product.id);
  };

  const handleEditClick = (rating: Rating) => {
    setSelectedRating(rating);
    setIsCreating(true);
    setNewRating(rating.rating);
    setNewTitle(rating.title || '');
    setNewComment(rating.comment || '');
    setIsAnonymous(rating.is_anonymous);
  };

  const handleCancel = () => {
    setSelectedRating(null);
    setIsCreating(false);
    setNewRating(5);
    setNewTitle('');
    setNewComment('');
    setIsAnonymous(false);
  };

  const handlePageChange = (newPage: number) => {
    if (!product) return;
    void fetchRatings(product.id, newPage);
  };

  if (!open || !product) return null;

  const renderStars = (rating: number, interactive: boolean = false, onRate?: (r: number) => void) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star ${star <= rating ? 'filled' : ''}`}
            onClick={() => interactive && onRate?.(star)}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const renderRatingForm = () => {
    if (!isCreating) return null;

    return (
      <div className="rating-form">
        <div className="rating-form-header">
          <h4>{selectedRating ? 'Edit Rating' : 'Write a Review'}</h4>
          <button type="button" className="x" onClick={handleCancel}>✕</button>
        </div>

        <div className="field">
          <span>Your Rating</span>
          {renderStars(newRating, true, (r) => setNewRating(r))}
        </div>

        <div className="field">
          <span>Title (optional)</span>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Summarize your review"
            maxLength={100}
          />
        </div>

        <div className="field">
          <span>Comment (optional)</span>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your experience with this product"
            rows={4}
            maxLength={1000}
          />
        </div>

        <div className="field">
          <label className="check">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked === true)}
            />
            <span>Post as anonymous</span>
          </label>
        </div>

        {error ? <div className="notice error">{error}</div> : null}

        <div className="form-actions">
          <button type="button" className="ghost" onClick={handleCancel}>Cancel</button>
          {selectedRating ? (
            <>
              <button type="button" className="danger" onClick={handleDeleteRating} disabled={loading}>
                Delete
              </button>
              <button type="button" className="primary" onClick={handleUpdateRating} disabled={loading}>
                {loading ? 'Saving...' : 'Update'}
              </button>
            </>
          ) : (
            <button type="button" className="primary" onClick={handleCreateRating} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderRatingCard = (rating: Rating) => {
    const isOwnRating = userId !== undefined && rating.user_id === userId;
    const helpfulCount = rating.helpful_votes?.filter((v) => v.is_helpful).length ?? 0;
    const hasVoted = userId !== undefined && rating.helpful_votes?.some((v) => v.user_id === userId);

    return (
      <div key={rating.id} className={`rating-card ${selectedRating?.id === rating.id ? 'selected' : ''}`}>
        <div className="rating-header">
          <div className="rating-user">
            <span className="rating-avatar">{rating.is_anonymous ? '👤' : '👤'}</span>
            <span className="rating-username">{rating.is_anonymous ? 'Anonymous' : `User ${rating.user_id.slice(0, 8)}`}</span>
          </div>
          <div className="rating-meta">
            {renderStars(rating.rating)}
            <span className="rating-date">{new Date(rating.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {rating.title && <div className="rating-title">{rating.title}</div>}
        {rating.comment && <div className="rating-comment">{rating.comment}</div>}

        {rating.images && rating.images.length > 0 && (
          <div className="rating-images">
            {rating.images.map((img, idx) => (
              <img key={idx} src={img} alt={`Review image ${idx + 1}`} />
            ))}
          </div>
        )}

        <div className="rating-footer">
          <div className="rating-actions-left">
            <button
              type="button"
              className={`helpful-btn ${hasVoted ? 'voted' : ''}`}
              onClick={() => void handleToggleHelpful(rating)}
              disabled={!userId || isOwnRating}
            >
              👍 Helpful ({helpfulCount})
            </button>
            <button
              type="button"
              className="ghost small"
              onClick={() => {
                if (!product) return;
                if (confirm('Report this rating as inappropriate?')) {
                  void reportRating(rating.id, product.id);
                }
              }}
              disabled={!userId || isOwnRating}
            >
              Report
            </button>
          </div>

          {isOwnRating && (
            <button type="button" className="ghost small" onClick={() => handleEditClick(rating)}>
              Edit
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal wide" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Product Reviews: {product.name}</div>
            <div className="muted small">
              {stats.totalRatings} reviews · {stats.averageRating.toFixed(1)} avg rating
            </div>
          </div>
          <button type="button" className="x" onClick={onClose}>✕</button>
        </div>

        <div className="rating-body">
          <div className="rating-summary">
            <div className="stats-card">
              <div className="stats-big">
                <div className="stats-number">{stats.averageRating.toFixed(1)}</div>
                <div className="stats-stars">{renderStars(Math.round(stats.averageRating))}</div>
                <div className="stats-count">{stats.totalRatings} reviews</div>
              </div>

              <div className="stats-breakdown">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratings.filter((r) => r.rating === star).length;
                  const percentage = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;
                  return (
                    <div key={star} className="stats-row">
                      <span>{star} ★</span>
                      <div className="stats-bar">
                        <div className="stats-fill" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="stats-pct">{percentage.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {orderId && (
              <button
                type="button"
                className="primary write-review-btn"
                onClick={() => {
                  setSelectedRating(null);
                  setIsCreating(true);
                  setNewRating(5);
                  setNewTitle('');
                  setNewComment('');
                  setIsAnonymous(false);
                }}
                disabled={!userId}
              >
                {userId ? 'Write a Review' : 'Login to Review'}
              </button>
            )}
          </div>

          <div className="rating-list-container">
            {loading && ratings.length === 0 ? (
              <div className="loading-state">Loading reviews...</div>
            ) : error && ratings.length === 0 ? (
              <div className="notice error">{error}</div>
            ) : ratings.length === 0 ? (
              <div className="empty-state">
                <p>No reviews yet for this product.</p>
                <p>Be the first to share your experience!</p>
              </div>
            ) : (
              <>
                <div className="rating-list">
                  {ratings.map(renderRatingCard)}
                </div>

                {pagination.totalPages > 1 && (
                  <div className="pagination">
                    <button
                      type="button"
                      className="ghost"
                      disabled={pagination.page <= 1}
                      onClick={() => void handlePageChange(pagination.page - 1)}
                    >
                      Previous
                    </button>
                    <span className="page-info">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      className="ghost"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => void handlePageChange(pagination.page + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {renderRatingForm()}
        </div>
      </div>
    </div>
  );
}