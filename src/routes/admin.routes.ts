import express from 'express';
import {
  getDashboardStats,
  getSalesReport,
  getTopProducts,
  getInventoryAlerts,
  getOrdersByStatus,
  getNewUsers,
  getReviewStats,
  getAllOrders,
  updateOrderStatus,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getInventory,
  updateInventory,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct
} from '../controllers/admin.controller';
import { protect, admin } from '../middleware/auth.middleware';
import { uploadImage } from '../utils/upload.util';
import { validate } from '../middleware/validation.middleware';
import { productSchema } from '../utils/validation.schema';

const router = express.Router();

// Tất cả routes đều yêu cầu đăng nhập và quyền admin
router.use(protect, admin);

// Dashboard
router.get('/stats', getDashboardStats);
router.get('/stats/sales', getSalesReport);
router.get('/stats/top-products', getTopProducts);
router.get('/stats/inventory-alerts', getInventoryAlerts);
router.get('/stats/orders-by-status', getOrdersByStatus);
router.get('/stats/new-users', getNewUsers);
router.get('/stats/reviews', getReviewStats);

// Orders admin routes
router.get('/orders', getAllOrders);
router.put('/orders/:id', updateOrderStatus);

// Users admin routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Inventory admin routes
router.get('/inventory', getInventory);
router.put('/inventory/:id', updateInventory);

// Upload route
router.post('/upload', protect, admin, uploadImage.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Không có file nào được tải lên' });
  }
  
  const imageUrl = req.file.path.replace(/\\/g, '/').split('uploads/')[1];
  res.status(200).json({ 
    success: true, 
    imageUrl: `${req.protocol}://${req.get('host')}/uploads/${imageUrl}` 
  });
});

// Products admin routes
router.get('/products', getAdminProducts);
router.post('/products', uploadImage.single('image'), validate(productSchema), createAdminProduct);
router.put('/products/:id', uploadImage.single('image'), validate(productSchema), updateAdminProduct);
router.delete('/products/:id', deleteAdminProduct);

export default router; 