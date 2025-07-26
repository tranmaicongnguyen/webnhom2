import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductCategories,
  getProductBrands,
  checkProductsStock,
  getProductStyles,
  getProductGenders,
  getProductMaterials
} from '../controllers/product.controller';
import { protect, admin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { productSchema } from '../utils/validation.schema';
import reviewRoutes from './review.routes';
import { uploadImage } from '../utils/upload.util';

const router = express.Router();

// Sử dụng nested routes cho reviews
router.use('/:id/reviews', reviewRoutes);

// Public routes
router.get('/', getProducts);
router.get('/categories', getProductCategories);
router.get('/brands', getProductBrands);
router.get('/styles', getProductStyles);
router.get('/genders', getProductGenders);
router.get('/materials', getProductMaterials);
router.post('/check-stock', checkProductsStock);

router.get('/:id', getProductById);

// Admin routes
router.post('/', protect, admin, uploadImage.single('image'), validate(productSchema), createProduct);
router.put('/:id', protect, admin, uploadImage.single('image'), validate(productSchema), updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

export default router; 