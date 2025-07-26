import express from 'express';
import {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  createSepayQRCode,
  updatePaymentMethod,
} from '../controllers/order.controller';
import { protect, admin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { orderSchema } from '../utils/validation.schema';
import { normalizeOrderData } from '../middleware/orderProcessing.middleware';
import { checkPaymentStatus } from '../controllers/payment.controller';

const router = express.Router();

// Public route không yêu cầu đăng nhập
router.get('/:id/public-payment-status', checkPaymentStatus);

// Protected routes (đăng nhập)
router.post('/', protect, normalizeOrderData, validate(orderSchema), createOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/pay', protect, updateOrderToPaid);
router.put('/:id/payment-method', protect, updatePaymentMethod);
router.get('/:id/sepay-qr', protect, createSepayQRCode);
router.get('/:id/payment-status', protect, checkPaymentStatus);

// Admin routes
router.get('/', protect, admin, getOrders);
router.put('/:id/deliver', protect, admin, updateOrderToDelivered);
router.put('/:id/status', protect, admin, updateOrderStatus);

export default router; 