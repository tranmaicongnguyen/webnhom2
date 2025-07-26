import { Request, Response, NextFunction } from 'express';
import env from '../config/env.config';

interface ErrorResponse extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: Record<string, any>;
  errors?: Record<string, any>;
}

// Middleware xử lý route không tồn tại
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Không tìm thấy - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Middleware xử lý lỗi chung
export const errorHandler = (
  err: ErrorResponse,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Xử lý lỗi từ Mongoose
  if (err.name === 'CastError' && (err as any).kind === 'ObjectId') {
    statusCode = 404;
    message = 'Không tìm thấy tài nguyên';
  }

  // Xử lý lỗi trùng lặp (unique)
  if (err.code === 11000) {
    statusCode = 400;
    message = `Dữ liệu đã tồn tại: ${JSON.stringify(err.keyValue)}`;
  }

  // Xử lý lỗi validation
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const validationErrors = Object.values(err.errors || {}).map((val: any) => val.message);
    message = `Lỗi dữ liệu không hợp lệ: ${validationErrors.join(', ')}`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: env.nodeEnv === 'production' ? null : err.stack,
  });
}; 