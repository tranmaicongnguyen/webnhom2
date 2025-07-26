import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/user.controller';
import { protect, admin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { registerSchema, loginSchema, updateUserSchema } from '../utils/validation.schema';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);

// Protected routes (đăng nhập)
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, validate(updateUserSchema), updateUserProfile);

// Admin routes
router.get('/', protect, admin, getUsers);
router.get('/:id', protect, admin, getUserById);
router.put('/:id', protect, admin, validate(updateUserSchema), updateUser);
router.delete('/:id', protect, admin, deleteUser);

export default router; 