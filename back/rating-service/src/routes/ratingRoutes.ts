import { Router } from 'express';
import {
  getRatingsByProduct,
  createRating,
  updateRating,
  deleteRating,
  getUserRatings,
  toggleHelpfulVote,
  reportRating,
} from '../controllers/ratingController';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'rating-service' });
});

router.get('/products/:productId/ratings', getRatingsByProduct);
router.post('/products/:productId/ratings', createRating);
router.get('/users/ratings', getUserRatings);
router.put('/ratings/:ratingId', updateRating);
router.delete('/ratings/:ratingId', deleteRating);
router.post('/ratings/:ratingId/helpful', toggleHelpfulVote);
router.post('/ratings/:ratingId/report', reportRating);

export default router;
