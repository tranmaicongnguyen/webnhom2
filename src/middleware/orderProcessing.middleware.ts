import { Request, Response, NextFunction } from 'express';

/**
 * Middleware để chuẩn hóa dữ liệu đơn hàng trước khi xử lý
 */
export const normalizeOrderData = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body.orderItems && Array.isArray(req.body.orderItems)) {
      // Chuẩn hóa các trường dữ liệu trong mỗi sản phẩm
      req.body.orderItems = req.body.orderItems.map((item: any) => {
        // Chuẩn hóa size: chuyển thành số nếu có thể
        if (item.size !== undefined) {
          // Nếu size là chuỗi chứa số, chuyển thành số
          if (typeof item.size === 'string' && !isNaN(Number(item.size))) {
            item.size = Number(item.size);
          }
        }
        
        // Đảm bảo các trường khác cũng có kiểu dữ liệu đúng
        if (item.quantity !== undefined) {
          item.quantity = Number(item.quantity);
        }
        
        if (item.price !== undefined) {
          item.price = Number(item.price);
        }
        
        return item;
      });
    }
    
    // Đi tiếp middleware tiếp theo
    next();
  } catch (error) {
    console.error('Error in normalizeOrderData middleware:', error);
    next(error);
  }
}; 