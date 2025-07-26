import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/db.config';
import env from './config/env.config';
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import reviewRoutes from './routes/review.routes';
import inventoryRoutes from './routes/inventory.routes';
import adminRoutes from './routes/admin.routes';
import paymentRoutes from './routes/payment.routes';
import { notFound, errorHandler } from './middleware/error.middleware';
import { sepayWebhook } from './controllers/payment.controller';

// Kết nối MongoDB
connectDB();

// Khởi tạo Express app
const app: Express = express();

// QUAN TRỌNG: Xử lý CORS cho tất cả các requests
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-sepay-signature');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// CORS middleware chính
app.use(cors({
  origin: '*', // Cho phép tất cả các nguồn
  credentials: false, // Không gửi cookie qua CORS
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-sepay-signature', 'Origin', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Total-Count']
}));

// Xử lý webhook SEPay trực tiếp (không qua các middleware phức tạp)
app.post('/api/payments/webhook/sepay', express.json(), sepayWebhook);

// Thiết lập security middleware sau CORS
app.use(helmet({
  crossOriginResourcePolicy: false, // Cho phép truy cập tài nguyên từ các nguồn khác
  contentSecurityPolicy: false // Tắt CSP để tránh xung đột
}));

// Thêm body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting - không áp dụng cho webhook
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  limit: 100, // Giới hạn mỗi IP là 100 requests mỗi 15 phút
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' },
});
app.use(limiter);

// Logger
if (env.isDevelopment) {
  app.use(morgan('dev'));
}

// Đường dẫn tĩnh cho hình ảnh được upload
const uploadsPath = path.join(__dirname, '../uploads');
// Đảm bảo thư mục uploads tồn tại
if (!fs.existsSync(uploadsPath)) {
  console.log('Creating uploads directory at:', uploadsPath);
  fs.mkdirSync(uploadsPath, { recursive: true });
}
console.log('Uploads directory path:', uploadsPath);
app.use('/uploads', express.static(uploadsPath));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/products/:id/reviews', reviewRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Thêm middleware để xử lý CORS preflight requests cho tất cả các routes
app.options('*', cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-sepay-signature', 'Origin', 'Accept']
}));

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'API is running' });
});

// Error middleware
app.use(notFound);
app.use(errorHandler);

// Khởi động server
const PORT = env.port;
app.listen(PORT, () => {
  console.log(`Server đang chạy ở cổng ${PORT} trong môi trường ${env.nodeEnv}`);
});