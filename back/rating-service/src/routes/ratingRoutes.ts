import { Router } from 'express';
import {
  getBulkStats,
  getRatingsByProduct,
  createRating,
  updateRating,
  deleteRating,
  getUserRatings,
  toggleHelpfulVote,
  reportRating,
  getUserEligibilities,
  checkEligibility,
} from '../controllers/ratingController';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'rating-service' });
});

router.get('/stats/bulk', getBulkStats);
router.get('/products/:productId/ratings', getRatingsByProduct);
router.post('/products/:productId/ratings', createRating);
router.get('/users/ratings', getUserRatings);
router.get('/users/eligibilities', getUserEligibilities);
router.get('/eligibilities/:productId/check', checkEligibility);
router.put('/ratings/:ratingId', updateRating);
router.delete('/ratings/:ratingId', deleteRating);
router.post('/ratings/:ratingId/helpful', toggleHelpfulVote);
router.post('/ratings/:ratingId/report', reportRating);

export default router;