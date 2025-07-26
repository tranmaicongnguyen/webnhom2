import express from 'express';
import {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
} from '../controllers/review.controller';
import { protect, admin } from '../middleware/auth.middleware';

const router = express.Router({ mergeParams: true });

// /api/products/:id/reviews
router.route('/')
  .get(getProductReviews)
  .post(protect, createReview);

// /api/products/:id/reviews/:reviewId
router.route('/:reviewId')
  .put(protect, updateReview)
  .delete(protect, deleteReview);

export default router; 