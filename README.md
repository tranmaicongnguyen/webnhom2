# WebFashion - Backend API

Backend RESTful API cho website bán quần áo thời trang.

## Công nghệ sử dụng

- Node.js
- Express
- TypeScript
- MongoDB (Mongoose)
- JWT Authentication
- Joi Validation

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Chạy ở môi trường development
npm run dev

# Build cho production
npm run build

# Chạy ở môi trường production
npm start
```

## Cấu trúc dự án

```
src/
  ├── config/         # Cấu hình ứng dụng và database
  ├── controllers/    # Xử lý logic cho các routes
  ├── middleware/     # Middleware (auth, error, validation)
  ├── models/         # Mongoose models
  ├── routes/         # Express routes
  ├── utils/          # Utilities và helpers
  └── index.ts        # Entry point
```

## API Endpoints

### Người dùng

- `POST /api/users/register` - Đăng ký người dùng mới
- `POST /api/users/login` - Đăng nhập
- `GET /api/users/profile` - Lấy thông tin người dùng (yêu cầu đăng nhập)
- `PUT /api/users/profile` - Cập nhật thông tin người dùng (yêu cầu đăng nhập)
- `GET /api/users` - Lấy danh sách người dùng (chỉ admin)
- `GET /api/users/:id` - Lấy thông tin người dùng theo ID (chỉ admin)
- `PUT /api/users/:id` - Cập nhật người dùng (chỉ admin)
- `DELETE /api/users/:id` - Xóa người dùng (chỉ admin)

### Sản phẩm

- `GET /api/products` - Lấy danh sách sản phẩm
- `GET /api/products/:id` - Lấy thông tin sản phẩm theo ID
- `GET /api/products/categories` - Lấy danh sách các danh mục sản phẩm
- `GET /api/products/brands` - Lấy danh sách các thương hiệu
- `GET /api/products/genders` - Lấy danh sách giới tính
- `GET /api/products/styles` - Lấy danh sách kiểu dáng
- `GET /api/products/materials` - Lấy danh sách chất liệu
- `POST /api/products` - Tạo sản phẩm mới (chỉ admin)
- `PUT /api/products/:id` - Cập nhật sản phẩm (chỉ admin)
- `DELETE /api/products/:id` - Xóa sản phẩm (chỉ admin)

### Đánh giá sản phẩm

- `GET /api/products/:id/reviews` - Lấy tất cả đánh giá của sản phẩm
- `POST /api/products/:id/reviews` - Thêm đánh giá cho sản phẩm (yêu cầu đăng nhập)
- `PUT /api/products/:id/reviews/:reviewId` - Cập nhật đánh giá (yêu cầu đăng nhập)
- `DELETE /api/products/:id/reviews/:reviewId` - Xóa đánh giá (yêu cầu đăng nhập)

### Đơn hàng

- `POST /api/orders` - Tạo đơn hàng mới (yêu cầu đăng nhập)
- `GET /api/orders/myorders` - Lấy danh sách đơn hàng của người dùng (yêu cầu đăng nhập)
- `GET /api/orders/:id` - Lấy thông tin đơn hàng theo ID (yêu cầu đăng nhập)
- `PUT /api/orders/:id/pay` - Cập nhật trạng thái thanh toán đơn hàng (yêu cầu đăng nhập)
- `GET /api/orders` - Lấy tất cả đơn hàng (chỉ admin)
- `PUT /api/orders/:id/deliver` - Cập nhật trạng thái giao hàng (chỉ admin)
- `PUT /api/orders/:id/status` - Cập nhật trạng thái đơn hàng (chỉ admin)



### Quản lý tồn kho

- `POST /api/inventory/check-availability` - Kiểm tra tính khả dụng của sản phẩm
- `GET /api/inventory` - Lấy tất cả mục tồn kho (chỉ admin)
- `POST /api/inventory` - Tạo mục tồn kho mới (chỉ admin)
- `GET /api/inventory/:id` - Lấy thông tin mục tồn kho theo ID (chỉ admin)
- `PUT /api/inventory/:id` - Cập nhật mục tồn kho (chỉ admin)
- `DELETE /api/inventory/:id` - Xóa mục tồn kho (chỉ admin)
- `GET /api/inventory/product/:productId` - Lấy tồn kho theo sản phẩm (chỉ admin)

### Admin Dashboard & Báo cáo

- `GET /api/admin/dashboard` - Lấy thống kê tổng quan (chỉ admin)
- `GET /api/admin/reports/revenue` - Lấy báo cáo doanh thu (chỉ admin)
- `GET /api/admin/reports/top-products` - Lấy báo cáo sản phẩm bán chạy (chỉ admin)
- `GET /api/admin/reports/inventory-alerts` - Lấy báo cáo tồn kho cần nhập thêm (chỉ admin)
- `GET /api/admin/reports/orders-by-status` - Lấy báo cáo đơn hàng theo trạng thái (chỉ admin)

## Xác thực & Bảo mật

API sử dụng JWT để xác thực người dùng. Gửi token trong header như sau:

```
Authorization: Bearer <token>
```

## Bảo mật

- Helmet để tăng cường bảo mật HTTP headers
- Rate limiting để ngăn chặn brute force attacks
- Validation để đảm bảo dữ liệu nhập vào hợp lệ
- Mật khẩu được hash bằng bcrypt

## Tính năng đặc biệt

- **Quản lý tồn kho chi tiết**: Theo dõi số lượng từng sản phẩm theo kích cỡ và màu sắc
- **Phân loại theo giới tính**: Sản phẩm được phân loại theo Nam, Nữ, Trẻ em, hoặc Unisex
- **Đa dạng thuộc tính sản phẩm**: Hỗ trợ thông tin về chất liệu, kiểu dáng, hướng dẫn giặt
- **Hệ thống đánh giá sản phẩm**: Cho phép người dùng đánh giá và bình luận về sản phẩm
- **Mã giảm giá linh hoạt**: Hỗ trợ giảm giá theo phần trăm hoặc số tiền cố định
- **Dashboard cho admin**: Thống kê doanh thu, sản phẩm bán chạy, đơn hàng...
- **Báo cáo chi tiết**: Báo cáo doanh thu, tồn kho, đơn hàng theo trạng thái 