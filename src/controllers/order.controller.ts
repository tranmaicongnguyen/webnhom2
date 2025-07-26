import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order, { IOrder } from '../models/Order.model';
import Product from '../models/Product.model';

// Thêm hằng số cho Sepay
const SEPAY_CONFIG = {
  ACCOUNT_NUMBER: '103870429701',
  BANK_CODE: 'VietinBank', // Techcombank
  ACCOUNT_NAME: 'CÔNG TY TNHH STORECLOTHES'
};

/**
 * Tạo QR code cho Sepay
 * @param orderId ID đơn hàng
 * @param amount Số tiền
 * @returns Thông tin QR code
 */
const generateSepayQRInfo = (orderId: string, amount: number) => {
  // Tạo reference cho Sepay
  const pattern = 'SEVQR';
  const orderType = 'ORD'; // Viết tắt của ORDER
  const cleanedOrderId = orderId.substring(orderId.length - 6);
  const timestamp = Date.now().toString().substring(8, 13); // 5 chữ số cuối của timestamp
  
  // Nội dung chuyển khoản
  const sePayReference = `${pattern} ${orderType}${cleanedOrderId}${timestamp}`;
  
  // URL QR code
  const encodedContent = encodeURIComponent(sePayReference);
  const qrCodeUrl = `https://qr.sepay.vn/img?acc=${SEPAY_CONFIG.ACCOUNT_NUMBER}&bank=${SEPAY_CONFIG.BANK_CODE}&amount=${amount}&des=${encodedContent}&template=compact`;
  
  return {
    reference: sePayReference,
    qrCodeUrl,
    accountNumber: SEPAY_CONFIG.ACCOUNT_NUMBER,
    bankCode: SEPAY_CONFIG.BANK_CODE,
    accountName: SEPAY_CONFIG.ACCOUNT_NAME
  };
};

// @desc    Tạo đơn hàng mới
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Create order request body:', req.body);
    
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice,
    } = req.body;

    // Kiểm tra orderItems có tồn tại và không rỗng
    if (!orderItems || orderItems.length === 0) {
      console.log('Error: No order items');
      res.status(400).json({ success: false, message: 'Không có sản phẩm trong đơn hàng' });
      return;
    }

    // Kiểm tra tính hợp lệ của các sản phẩm trong đơn hàng
    for (const item of orderItems) {
      if (!item.product) {
        console.log('Error: Missing product ID in item:', item);
        res.status(400).json({ success: false, message: 'ID sản phẩm là bắt buộc' });
        return;
      }

      if (!item.quantity || item.quantity <= 0) {
        console.log('Error: Invalid quantity for product:', item.name);
        res.status(400).json({ success: false, message: `Số lượng sản phẩm phải lớn hơn 0: ${item.name}` });
        return;
      }

      if (!item.size) {
        console.log('Error: Missing size for product:', item.name);
        res.status(400).json({ success: false, message: `Size sản phẩm là bắt buộc: ${item.name}` });
        return;
      }

      if (!item.color) {
        console.log('Error: Missing color for product:', item.name);
        res.status(400).json({ success: false, message: `Màu sắc sản phẩm là bắt buộc: ${item.name}` });
        return;
      }

      const product = await Product.findById(item.product);
      if (!product) {
        console.log('Error: Product not found:', item.product);
        res.status(400).json({ success: false, message: `Sản phẩm không tồn tại: ${item.name || 'Không xác định'}` });
        return;
      }

      if (product.countInStock < item.quantity) {
        console.log('Error: Insufficient stock for product:', item.name);
        res.status(400).json({
          success: false,
          message: `Sản phẩm ${item.name} chỉ còn ${product.countInStock} trong kho`,
        });
        return;
      }

      // Kiểm tra size và color có tồn tại trong sản phẩm không
      console.log('Product sizes:', product.sizes, 'Item size:', item.size, 'Type:', typeof item.size);
      
      // Chuyển đổi size thành số nếu là chuỗi số
      const sizeToCheck = typeof item.size === 'string' && !isNaN(Number(item.size))
        ? Number(item.size)
        : item.size;
      
      // Kiểm tra size trong mảng sizes của sản phẩm
      const sizeExists = product.sizes.some(s => 
        (typeof s === 'number' && typeof sizeToCheck === 'number' && s === sizeToCheck) ||
        (typeof s === 'string' && typeof sizeToCheck === 'string' && s === sizeToCheck) ||
        (typeof s === 'number' && typeof sizeToCheck === 'string' && s.toString() === sizeToCheck) ||
        (typeof s === 'string' && typeof sizeToCheck === 'number' && s === sizeToCheck.toString())
      );
      
      if (!sizeExists) {
        console.log('Error: Size not available for product:', item.name);
        res.status(400).json({
          success: false,
          message: `Size ${item.size} không có sẵn cho sản phẩm ${item.name}`,
        });
        return;
      }

      console.log('Product colors:', product.colors, 'Item color:', item.color);
      if (!product.colors.includes(item.color)) {
        console.log('Error: Color not available for product:', item.name);
        res.status(400).json({
          success: false,
          message: `Màu ${item.color} không có sẵn cho sản phẩm ${item.name}`,
        });
        return;
      }
    }

    // Kiểm tra thông tin giao hàng
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.address || 
        !shippingAddress.city || !shippingAddress.phone) {
      console.log('Error: Incomplete shipping address:', shippingAddress);
      res.status(400).json({ success: false, message: 'Thông tin giao hàng không đầy đủ' });
      return;
    }

    // Kiểm tra phương thức thanh toán
    if (!paymentMethod) {
      console.log('Error: Missing payment method');
      res.status(400).json({ success: false, message: 'Phương thức thanh toán là bắt buộc' });
      return;
    }

    // Tạo đơn hàng mới
    const order = await Order.create({
      user: req.user?._id,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice: itemsPrice || 0,
      shippingPrice: shippingPrice || 0,
      totalPrice: totalPrice || 0,
    });

    console.log('Order created successfully:', order);

    // Cập nhật số lượng sản phẩm trong kho
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.countInStock -= item.quantity;
        await product.save();
      }
    }

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error(`Lỗi tạo đơn hàng: ${(error as Error).message}`);
    console.error('Error stack:', (error as Error).stack);
    
    // Xử lý lỗi chi tiết hơn
    if ((error as any).name === 'ValidationError') {
      const errors = Object.values((error as any).errors).map((err: any) => err.message);
      console.log('Validation errors:', errors);
      res.status(400).json({ success: false, message: errors.join(', ') });
    } else if ((error as any).name === 'CastError') {
      console.log('Cast error:', error);
      res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    } else {
      res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo đơn hàng' });
    }
  }
};

// @desc    Lấy đơn hàng theo ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('getOrderById called with ID:', req.params.id);
    console.log('User making request:', req.user?._id, 'Role:', req.user?.role);
    
    const orderId = req.params.id;
    let order = null;
    
    console.log('Order ID type check:', {
      orderId,
      isValidObjectId: mongoose.Types.ObjectId.isValid(orderId),
      startsWithORD: orderId.startsWith('ORD')
    });
    
    // Thử tìm bằng findById trước (sẽ work với cả ObjectId và custom string ID)
    try {
      order = await Order.findById(orderId).populate('user', 'name email');
      console.log('Found order using findById:', order?._id);
    } catch (findByIdError) {
      console.log('findById failed, trying alternative methods:', findByIdError.message);
    }
    
    // Nếu findById không work (có thể do format ID), thử với findOne
    if (!order) {
      console.log('Trying findOne with _id field...');
      try {
        order = await Order.findOne({ _id: orderId }).populate('user', 'name email');
        console.log('Found order using findOne:', order?._id);
      } catch (findOneError) {
        console.log('findOne also failed:', findOneError.message);
      }
    }
    
    // Nếu vẫn không tìm thấy, thử tìm trong tất cả orders và so sánh _id
    if (!order) {
      console.log('Trying to find by matching string _id...');
      const allUserOrders = await Order.find({ user: req.user?._id }).populate('user', 'name email');
      order = allUserOrders.find(o => o._id.toString() === orderId);
      console.log('Found order by string matching:', order?._id);
    }

    if (!order) {
      console.log('Order not found with any method:', orderId);
      res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      return;
    }

    console.log('Order found:', order._id);
    console.log('Order user ID:', order.user._id?.toString());
    console.log('Request user ID:', req.user?._id?.toString());
    console.log('Order user type:', typeof order.user._id);
    console.log('Request user type:', typeof req.user?._id);

    // Kiểm tra quyền truy cập (chỉ admin hoặc chủ đơn hàng)
    const orderUserId = order.user._id?.toString();
    const requestUserId = req.user?._id?.toString();
    
    if (req.user?.role !== 'admin' && orderUserId !== requestUserId) {
      console.log('Access denied - user does not own this order');
      console.log(`Order belongs to: ${orderUserId}, Request from: ${requestUserId}`);
      res.status(403).json({ success: false, message: 'Không có quyền truy cập đơn hàng này' });
      return;
    }

    console.log('Access granted - returning order data');
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error(`Lỗi lấy thông tin đơn hàng: ${(error as Error).message}`);
    console.error('Error stack:', (error as Error).stack);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Cập nhật trạng thái đã thanh toán
// @route   PUT /api/orders/:id/pay
// @access  Private
export const updateOrderToPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      return;
    }

    // Kiểm tra quyền truy cập (chỉ admin hoặc chủ đơn hàng)
    if (req.user?.role !== 'admin' && order.user.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: 'Không có quyền cập nhật đơn hàng này' });
      return;
    }

    order.isPaid = true;
    order.paidAt = new Date();
    
    // Thêm thông tin thanh toán từ request
    const { id, status, update_time, email_address, payment_method, reference } = req.body;
    
    order.paymentResult = {
      id: id || 'manual',
      status: status || 'success',
      update_time: update_time || new Date().toISOString(),
      email_address: email_address || '',
      reference: reference || '',
    };

    // Cập nhật phương thức thanh toán nếu có ( COD, v.v.)
    if (payment_method) {
      order.paymentMethod = payment_method;
    }

    const updatedOrder = await order.save();
    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error(`Lỗi cập nhật trạng thái thanh toán: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Cập nhật trạng thái đã giao hàng
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
export const updateOrderToDelivered = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      return;
    }

    order.isDelivered = true;
    order.deliveredAt = new Date();
    order.status = 'delivered';

    const updatedOrder = await order.save();
    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error(`Lỗi cập nhật trạng thái giao hàng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Cập nhật trạng thái đơn hàng
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      return;
    }

    // Kiểm tra trạng thái hợp lệ
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      return;
    }

    order.status = status;

    // Nếu trạng thái là delivered, cập nhật isDelivered
    if (status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }

    // Nếu trạng thái là cancelled, hoàn lại số lượng sản phẩm trong kho
    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const item of order.orderItems) {
        const product = await Product.findById(item.product);
        if (product) {
          product.countInStock += item.quantity;
          await product.save();
        }
      }
    }

    const updatedOrder = await order.save();
    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error(`Lỗi cập nhật trạng thái đơn hàng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy tất cả đơn hàng của người dùng đang đăng nhập
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('getMyOrders called for user:', req.user?._id);
    const orders = await Order.find({ user: req.user?._id });
    console.log('Found orders count:', orders.length);
    console.log('Order IDs:', orders.map(o => o._id));
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error(`Lỗi lấy danh sách đơn hàng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy tất cả đơn hàng
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    // Xử lý query parameters để lọc và phân trang
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.page) || 1;
    const status = req.query.status ? { status: req.query.status } : {};

    // Tính toán số lượng đơn hàng phù hợp với điều kiện lọc
    const count = await Order.countDocuments({ ...status });

    // Lấy danh sách đơn hàng theo điều kiện lọc và phân trang
    const orders = await Order.find({ ...status })
      .populate('user', 'id name')
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.status(200).json({
      success: true,
      data: {
        orders,
        page,
        pages: Math.ceil(count / pageSize),
        count,
      },
    });
  } catch (error) {
    console.error(`Lỗi lấy danh sách đơn hàng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Tạo QR code Sepay cho đơn hàng
// @route   GET /api/orders/:id/sepay-qr
// @access  Private
export const createSepayQRCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      return;
    }
    
    // Kiểm tra quyền truy cập (chỉ admin hoặc chủ đơn hàng)
    if (req.user?.role !== 'admin' && order.user.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: 'Không có quyền truy cập đơn hàng này' });
      return;
    }
    
    // Tạo thông tin QR Sepay
    const sepayInfo = generateSepayQRInfo(order._id.toString(), order.totalPrice);
    
    // Cập nhật đơn hàng với thông tin QR Sepay
    order.paymentResult = {
      ...order.paymentResult,
      id: sepayInfo.reference,
      reference: sepayInfo.reference
    };
    
    await order.save();
    
    res.status(200).json({
      success: true,
      data: {
        qrCodeUrl: sepayInfo.qrCodeUrl,
        reference: sepayInfo.reference,
        bankInfo: {
          accountName: sepayInfo.accountName,
          accountNumber: sepayInfo.accountNumber,
          bankCode: sepayInfo.bankCode,
          content: sepayInfo.reference
        },
        orderId: order._id,
        amount: order.totalPrice
      }
    });
  } catch (error) {
    console.error(`Lỗi tạo mã QR Sepay: ${(error as Error).message}`);
    res.status(500).json({ 
      success: false, 
      message: `Lỗi khi tạo mã QR Sepay: ${(error as Error).message}` 
    });
  }
};

// @desc    Cập nhật phương thức thanh toán
// @route   PUT /api/orders/:id/payment-method
// @access  Private
export const updatePaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentMethod } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      return;
    }

    // Kiểm tra quyền truy cập (chỉ admin hoặc chủ đơn hàng)
    if (req.user?.role !== 'admin' && order.user.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: 'Không có quyền cập nhật đơn hàng này' });
      return;
    }

    // Kiểm tra đơn hàng đã thanh toán chưa
    if (order.isPaid) {
      res.status(400).json({ success: false, message: 'Không thể thay đổi phương thức thanh toán của đơn hàng đã thanh toán' });
      return;
    }

    // Kiểm tra phương thức thanh toán hợp lệ
    const validPaymentMethods = ['cod', 'bank', 'sepay'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      res.status(400).json({ success: false, message: 'Phương thức thanh toán không hợp lệ' });
      return;
    }

    order.paymentMethod = paymentMethod;

    // Nếu chuyển sang COD, cập nhật trạng thái thành processing
    if (paymentMethod === 'cod') {
      order.status = 'processing';
    }

    const updatedOrder = await order.save();
    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error(`Lỗi cập nhật phương thức thanh toán: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
}; 