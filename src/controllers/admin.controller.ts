import { Request, Response } from 'express';
import User from '../models/User.model';
import Product from '../models/Product.model';
import Order from '../models/Order.model';
import Inventory from '../models/Inventory.model';
import Review from '../models/Review.model';
import mongoose from 'mongoose';

// @desc    Lấy thống kê tổng quan
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Tổng số người dùng
    const userCount = await User.countDocuments();
    
    // Tổng số sản phẩm
    const productCount = await Product.countDocuments();
    
    // Tổng số đơn hàng
    const orderCount = await Order.countDocuments();
    
    // Tổng doanh thu
    const orders = await Order.find({ isPaid: true });
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    
    // Đơn hàng trong ngày
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });
    
    // Doanh thu trong ngày
    const todayRevenue = orders
      .filter(order => new Date(order.createdAt) >= today)
      .reduce((sum, order) => sum + order.totalPrice, 0);
    
    // Tổng sản phẩm bán được
    const totalSold = orders.reduce((sum, order) => {
      return sum + order.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    
    // Sản phẩm hết hàng
    const outOfStockCount = await Product.countDocuments({ countInStock: 0 });
    
    res.status(200).json({
      success: true,
      data: {
        userCount,
        productCount,
        orderCount,
        totalRevenue,
        todayOrders,
        todayRevenue,
        totalSold,
        outOfStockCount,
      },
    });
  } catch (error) {
    console.error(`Lỗi lấy thống kê: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy báo cáo doanh thu theo khoảng thời gian
// @route   GET /api/admin/stats/sales
// @access  Private/Admin
export const getSalesReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, period = 'day' } = req.query;
    
    // Xác định khoảng thời gian
    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate as string) : new Date();
    
    // Đảm bảo endDate là cuối ngày
    end.setHours(23, 59, 59, 999);
    
    const matchStage = {
      createdAt: { $gte: start, $lte: end },
      isPaid: true
    };
    
    let groupStage;
    switch (period) {
      case 'day':
        groupStage = {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        };
        break;
      case 'week':
        groupStage = {
          _id: { 
            $week: '$createdAt'
          },
          year: { $first: { $year: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        };
        break;
      case 'month':
        groupStage = {
          _id: { 
            $dateToString: { format: '%Y-%m', date: '$createdAt' } 
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        };
        break;
      case 'year':
        groupStage = {
          _id: { $year: '$createdAt' },
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        };
        break;
      default:
        groupStage = {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        };
    }
    
    const pipeline = [
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { _id: 1 } }
    ];
    
    const salesData = await Order.aggregate(pipeline as any[]);
    
    // Tổng doanh thu trong khoảng thời gian
    const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
    const totalOrders = salesData.reduce((sum, item) => sum + item.count, 0);
    
    // Format lại dữ liệu
    const formattedData = salesData.map(item => {
      if (period === 'week') {
        return {
          period: `Week ${item._id} - ${item.year}`,
          orders: item.count,
          revenue: item.revenue
        };
      }
      return {
        period: item._id,
        orders: item.count,
        revenue: item.revenue
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        salesData: formattedData,
        totalRevenue,
        totalOrders,
        startDate: start,
        endDate: end,
      },
    });
  } catch (error) {
    console.error(`Lỗi lấy báo cáo doanh thu: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy báo cáo sản phẩm bán chạy
// @route   GET /api/admin/stats/top-products
// @access  Private/Admin
export const getTopProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    
    // Xác định khoảng thời gian
    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate as string) : new Date();
    
    // Đảm bảo endDate là cuối ngày
    end.setHours(23, 59, 59, 999);
    
    // Tạo pipeline để tính toán sản phẩm bán chạy
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' },
        }
      },
      {
        $unwind: '$orderItems'
      },
      {
        $group: {
          _id: '$orderItems.product',
          name: { $first: '$orderItems.name' },
          totalSold: { $sum: '$orderItems.quantity' },
          totalRevenue: { $sum: { $multiply: ['$orderItems.quantity', '$orderItems.price'] } },
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: Number(limit)
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo',
        }
      },
      {
        $addFields: {
          image: { $arrayElemAt: ['$productInfo.image', 0] },
          category: { $arrayElemAt: ['$productInfo.category', 0] },
          brand: { $arrayElemAt: ['$productInfo.brand', 0] },
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          totalSold: 1,
          totalRevenue: 1,
          image: 1,
          category: 1,
          brand: 1,
        }
      }
    ];
    
    const topProducts = await Order.aggregate(pipeline as any[]);
    
    res.status(200).json({
      success: true,
      data: topProducts,
    });
  } catch (error) {
    console.error(`Lỗi lấy báo cáo sản phẩm bán chạy: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy báo cáo tồn kho cần nhập thêm
// @route   GET /api/admin/stats/inventory-alerts
// @access  Private/Admin
export const getInventoryAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Lấy các mục tồn kho cần nhập thêm (ít hơn ngưỡng)
    const threshold = Number(req.query.threshold) || 5;
    
    // Lấy các mục tồn kho sắp hết
    const lowStockItems = await Inventory.find({ 
      quantity: { $gt: 0, $lte: threshold } 
    })
      .populate('product', 'name image brand category')
      .sort({ quantity: 1 });
    
    // Lấy các mục tồn kho đã hết
    const outOfStockItems = await Inventory.find({ quantity: 0 })
      .populate('product', 'name image brand category')
      .sort({ updatedAt: -1 });
    
    res.status(200).json({
      success: true,
      data: {
        lowStockItems,
        outOfStockItems,
        totalLowStock: lowStockItems.length,
        totalOutOfStock: outOfStockItems.length,
      },
    });
  } catch (error) {
    console.error(`Lỗi lấy báo cáo tồn kho: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy số lượng đơn hàng theo trạng thái
// @route   GET /api/admin/stats/orders-by-status
// @access  Private/Admin
export const getOrdersByStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderStatusCounts = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        }
      },
      {
        $sort: {
          _id: 1
        }
      }
    ]);
    
    // Format lại data thành object
    const formattedData = {
      pending: { count: 0, revenue: 0 },
      processing: { count: 0, revenue: 0 },
      shipped: { count: 0, revenue: 0 },
      delivered: { count: 0, revenue: 0 },
      cancelled: { count: 0, revenue: 0 },
    };
    
    orderStatusCounts.forEach(item => {
      if (formattedData[item._id]) {
        formattedData[item._id] = {
          count: item.count,
          revenue: item.revenue
        };
      }
    });
    
    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error(`Lỗi lấy thống kê đơn hàng theo trạng thái: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy thống kê người dùng mới
// @route   GET /api/admin/stats/new-users
// @access  Private/Admin
export const getNewUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));
    
    const newUsers = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    const totalNewUsers = newUsers.reduce((sum, item) => sum + item.count, 0);
    
    res.status(200).json({
      success: true,
      data: {
        newUsers,
        totalNewUsers,
        period: Number(days)
      },
    });
  } catch (error) {
    console.error(`Lỗi lấy thống kê người dùng mới: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy thống kê đánh giá sản phẩm
// @route   GET /api/admin/stats/reviews
// @access  Private/Admin
export const getReviewStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Tổng số đánh giá
    const totalReviews = await Review.countDocuments();
    
    // Đánh giá theo rating
    const ratingDistribution = await Review.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Lấy 5 sản phẩm có nhiều đánh giá nhất
    const mostReviewedProducts = await Review.aggregate([
      {
        $group: {
          _id: '$product',
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      },
      {
        $sort: { totalReviews: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $project: {
          _id: 1,
          totalReviews: 1,
          averageRating: 1,
          product: { $arrayElemAt: ['$productInfo', 0] }
        }
      }
    ]);
    
    // Format lại dữ liệu rating distribution
    const formattedRatingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };
    
    ratingDistribution.forEach(item => {
      formattedRatingDistribution[item._id] = item.count;
    });
    
    res.status(200).json({
      success: true,
      data: {
        totalReviews,
        ratingDistribution: formattedRatingDistribution,
        mostReviewedProducts
      },
    });
  } catch (error) {
    console.error(`Lỗi lấy thống kê đánh giá: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy tất cả đơn hàng
// @route   GET /api/admin/orders
// @access  Private/Admin
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, keyword } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;
    
    // Tạo query
    const query: any = {};
    
    // Lọc theo trạng thái
    if (status) {
      query.status = status;
    }
    
    // Tìm kiếm theo từ khóa (mã đơn, tên khách hàng, số điện thoại)
    if (keyword) {
      const keywordStr = keyword.toString();
      query.$or = [
        { _id: { $regex: keywordStr, $options: 'i' } }, // Tìm theo mã đơn
        { 'shippingAddress.fullName': { $regex: keywordStr, $options: 'i' } }, // Tìm theo tên
        { 'shippingAddress.phone': { $regex: keywordStr } } // Tìm theo số điện thoại
      ];
    }
    
    // Đếm tổng số đơn hàng theo điều kiện
    const total = await Order.countDocuments(query);
    
    // Lấy danh sách đơn hàng với phân trang
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);
    
    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      totalPages: Math.ceil(total / limitNumber),
      currentPage: pageNumber,
      orders,
    });
  } catch (error) {
    console.error(`Lỗi lấy danh sách đơn hàng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Cập nhật trạng thái đơn hàng
// @route   PUT /api/admin/orders/:id
// @access  Private/Admin
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`Đang cập nhật đơn hàng với ID: ${id}, status: ${status}`);
    
    // Tìm kiếm đơn hàng với nhiều cách khác nhau
    let order = null;
    
    // Cách 1: Tìm chính xác theo ID
    order = await Order.findOne({ _id: id });
    
    // Nếu không tìm thấy và ID là một chuỗi có thể là ObjectID, thử tìm bằng ObjectID
    if (!order && id.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        order = await Order.findById(id);
        console.log('Đã tìm thấy đơn hàng bằng ObjectID');
      } catch (err) {
        console.log('Không thể tìm thấy đơn hàng bằng ObjectID');
      }
    }
    
    if (!order) {
      // Tìm kiếm bằng regex nếu ID bắt đầu bằng ORD
      if (id.startsWith('ORD')) {
        order = await Order.findOne({ _id: { $regex: id, $options: 'i' } });
        console.log('Tìm kiếm đơn hàng bằng regex:', order ? 'Thành công' : 'Thất bại');
      }
    }
    
    if (!order) {
      console.log(`Không tìm thấy đơn hàng với ID: ${id}`);
      res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      return;
    }
    
    console.log(`Đã tìm thấy đơn hàng: ${order._id}`);
    
    // Kiểm tra status hợp lệ
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ' });
      return;
    }
    
    order.status = status;
    
    // Nếu đánh dấu là đã giao hàng
    if (status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }
    
    // Nếu hủy đơn hàng, hoàn lại số lượng vào kho
    if (status === 'cancelled') {
      // Hoàn lại số lượng sản phẩm vào kho
      for (const item of order.orderItems) {
        const product = await Product.findById(item.product);
        if (product) {
          product.countInStock += item.quantity;
          await product.save();
        }
      }
    }
    
    const updatedOrder = await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Đã cập nhật trạng thái đơn hàng',
      order: updatedOrder,
    });
  } catch (error) {
    console.error(`Lỗi cập nhật trạng thái đơn hàng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy danh sách người dùng
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;
    
    // Đếm tổng số người dùng
    const total = await User.countDocuments();
    
    // Lấy danh sách người dùng với phân trang
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);
    
    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limitNumber),
      currentPage: pageNumber,
      users,
    });
  } catch (error) {
    console.error(`Lỗi lấy danh sách người dùng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy thông tin người dùng theo ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }
    
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(`Lỗi lấy thông tin người dùng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Cập nhật thông tin người dùng
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, isAdmin } = req.body;
    
    const user = await User.findById(id);
    
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }
    
    // Cập nhật thông tin
    if (name) user.name = name;
    if (email) user.email = email;
    if (isAdmin !== undefined) user.isAdmin = isAdmin;
    
    const updatedUser = await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Đã cập nhật thông tin người dùng',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
      },
    });
  } catch (error) {
    console.error(`Lỗi cập nhật thông tin người dùng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Xóa người dùng
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }
    
    await user.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Đã xóa người dùng',
    });
  } catch (error) {
    console.error(`Lỗi xóa người dùng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy danh sách tồn kho
// @route   GET /api/admin/inventory
// @access  Private/Admin
export const getInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { product, size, color } = req.query;
    
    // Xây dựng query
    const query: any = {};
    if (product) query.product = product;
    if (size) query.size = size;
    if (color) query.color = color;
    
    // Lấy danh sách tồn kho
    const inventory = await Inventory.find(query)
      .populate('product', 'name image brand price')
      .sort({ quantity: 1 });
    
    res.status(200).json({
      success: true,
      count: inventory.length,
      inventory,
    });
  } catch (error) {
    console.error(`Lỗi lấy danh sách tồn kho: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Cập nhật thông tin tồn kho
// @route   PUT /api/admin/inventory/:id
// @access  Private/Admin
export const updateInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, threshold } = req.body;
    
    const inventoryItem = await Inventory.findById(id);
    
    if (!inventoryItem) {
      res.status(404).json({ success: false, message: 'Không tìm thấy mục tồn kho' });
      return;
    }
    
    // Cập nhật thông tin
    if (quantity !== undefined) inventoryItem.quantity = quantity;
    if (threshold !== undefined) inventoryItem.threshold = threshold;
    
    const updatedInventory = await inventoryItem.save();
    
    // Cập nhật tổng số lượng tồn kho cho sản phẩm
    const product = await Product.findById(inventoryItem.product);
    if (product) {
      const totalInventory = await Inventory.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(String(product._id)) } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]);
      
      if (totalInventory.length > 0) {
        product.countInStock = totalInventory[0].total;
        await product.save();
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Đã cập nhật thông tin tồn kho',
      inventory: updatedInventory,
    });
  } catch (error) {
    console.error(`Lỗi cập nhật thông tin tồn kho: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy danh sách sản phẩm (admin)
// @route   GET /api/admin/products
// @access  Private/Admin
export const getAdminProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      keyword = '', 
      category = '', 
      brand = '',
      sort = '-createdAt' 
    } = req.query;
    
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;
    
    // Xây dựng query
    const query: any = {};
    
    // Tìm kiếm theo từ khóa
    if (keyword) {
      const keywordStr = keyword.toString();
      query.$or = [
        { name: { $regex: keywordStr, $options: 'i' } },       // Tìm theo tên
        { description: { $regex: keywordStr, $options: 'i' } }, // Tìm theo mô tả
        { sku: { $regex: keywordStr, $options: 'i' } },         // Tìm theo mã SKU
        { brand: { $regex: keywordStr, $options: 'i' } },       // Tìm theo thương hiệu
        { category: { $regex: keywordStr, $options: 'i' } }     // Tìm theo danh mục
      ];
    }
    
    // Lọc theo danh mục
    if (category) {
      if (query.$or) {
        // Nếu đã có điều kiện tìm kiếm, thêm điều kiện lọc vào query riêng
        query.$and = [{ category }];
      } else {
        query.category = category;
      }
    }
    
    // Lọc theo thương hiệu
    if (brand) {
      if (query.$or || (query.$and && category)) {
        // Nếu đã có điều kiện tìm kiếm hoặc lọc danh mục
        if (!query.$and) query.$and = [];
        query.$and.push({ brand });
      } else {
        query.brand = brand;
      }
    }
    
    // Đếm tổng số sản phẩm
    const total = await Product.countDocuments(query);
    
    // Xử lý tham số sắp xếp
    const sortOption: any = {};
    if (typeof sort === 'string') {
      // Nếu sort bắt đầu bằng dấu '-' thì sắp xếp giảm dần, ngược lại tăng dần
      const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
      const sortOrder = sort.startsWith('-') ? -1 : 1;
      sortOption[sortField] = sortOrder;
    }
    
    // Lấy danh sách sản phẩm với phân trang và sắp xếp
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber);
    
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limitNumber),
      currentPage: pageNumber,
      products,
    });
  } catch (error) {
    console.error(`Lỗi lấy danh sách sản phẩm admin: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Tạo sản phẩm mới (admin)
// @route   POST /api/admin/products
// @access  Private/Admin
export const createAdminProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productData = {
      ...req.body,
      // Thêm user ID từ thông tin người dùng đã đăng nhập
      user: req.user?._id,
      // Lưu đường dẫn hình ảnh nếu có upload
      image: req.file ? `/uploads/${req.file.filename}` : req.body.image,
    };
    
    const product = await Product.create(productData);
    
    res.status(201).json({
      success: true,
      message: 'Đã tạo sản phẩm mới',
      product,
    });
  } catch (error) {
    console.error(`Lỗi tạo sản phẩm: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Cập nhật sản phẩm (admin)
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
export const updateAdminProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id);
    
    if (!product) {
      res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      return;
    }
    
    // Cập nhật thông tin sản phẩm
    const updateData = {
      ...req.body,
    };
    
    // Nếu có upload hình ảnh mới
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Đã cập nhật sản phẩm',
      product: updatedProduct,
    });
  } catch (error) {
    console.error(`Lỗi cập nhật sản phẩm: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Xóa sản phẩm (admin)
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
export const deleteAdminProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id);
    
    if (!product) {
      res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      return;
    }
    
    await product.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Đã xóa sản phẩm',
      product: { _id: id }
    });
  } catch (error) {
    console.error(`Lỗi xóa sản phẩm: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
}; 