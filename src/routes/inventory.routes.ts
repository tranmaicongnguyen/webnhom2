import express from 'express';
import {
  createInventoryItem,
  getAllInventory,
  getInventoryItemById,
  getInventoryByProduct,
  updateInventoryItem,
  deleteInventoryItem,
  checkAvailability,
  bulkUpdateInventory,
  syncProductInventory
} from '../controllers/inventory.controller';
import { protect, admin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { inventorySchema } from '../utils/validation.schema';

const router = express.Router();

// Kiểm tra tính khả dụng - Công khai
router.post('/check-availability', checkAvailability);

// Route cho Admin
router.use(protect, admin);
router.route('/')
  .get(getAllInventory)
  .post(validate(inventorySchema), createInventoryItem);

router.route('/:id')
  .get(getInventoryItemById)
  .put(updateInventoryItem)
  .delete(deleteInventoryItem);

router.get('/product/:productId', getInventoryByProduct);
router.post('/bulk-update', bulkUpdateInventory);
router.post('/sync/:productId', syncProductInventory);

export default router; 