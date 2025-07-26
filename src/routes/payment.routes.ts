import express from 'express';
import { 
  createSepayPaymentController,
  sepayWebhook,
  checkSepayStatus,
  checkSepayServerStatus,
  createSepayQRController,
  checkSepayQRController,
  checkPaymentStatus,
  createCODPayment,
  confirmCODPayment
} from '../controllers/payment.controller';
import { protect, admin } from '../middleware/auth.middleware';

const router = express.Router();

// Routes cho Sepay
router.post('/sepay', protect, createSepayPaymentController);
router.post('/sepay-webhook', sepayWebhook); // Public route - nhận webhook từ Sepay
router.post('/webhook/sepay', sepayWebhook); // Thêm route mới cho đường dẫn webhook từ ngrok
router.get('/sepay-status/:transactionId', protect, checkSepayStatus);
router.get('/sepay-server-status', checkSepayServerStatus); // Kiểm tra trạng thái server Sepay

// Routes cho Sepay QR code
router.post('/sepay-qr', protect, createSepayQRController);
router.get('/sepay-qr/:reference', protect, checkSepayQRController);

// Routes cho COD
router.post('/cod', protect, createCODPayment);
router.post('/confirm-cod', protect, admin, confirmCODPayment);

// Routes chung
router.get('/check/:id', protect, checkPaymentStatus);

export default router; 