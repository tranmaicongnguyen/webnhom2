import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env.config';
import User, { IUser } from '../models/User.model';
import mongoose from 'mongoose';

// Định nghĩa interface mở rộng cho Request
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface JwtPayload {
  id: string;
}

// Middleware bảo vệ route, yêu cầu đăng nhập
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token;

    // Kiểm tra token trong header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Kiểm tra nếu không có token
    if (!token) {
      res.status(401).json({ success: false, message: 'Không có token, quyền truy cập bị từ chối' });
      return;
    }

    // Xác thực token
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;

    // Lấy thông tin người dùng từ token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({ success: false, message: 'Người dùng không tồn tại' });
      return;
    }

    // Gán thông tin người dùng vào request
    req.user = user as IUser;
    next();
  } catch (error) {
    console.error(`Lỗi xác thực: ${(error as Error).message}`);
    res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

// Middleware kiểm tra quyền admin
export const admin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Không có quyền truy cập, chỉ admin mới được phép' });
  }
}; 