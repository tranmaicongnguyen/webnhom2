import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Inventory, { IInventoryItem } from '../models/Inventory.model';
import Product from '../models/Product.model';
import mongoose from 'mongoose';

// @desc    Tạo mục tồn kho mới
// @route   POST /api/inventory
// @access  Private/Admin
export const createInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const { product, size, color, quantity, location, sku } = req.body;

  // Kiểm tra sản phẩm có tồn tại không
  const productExists = await Product.findById(product);
  if (!productExists) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }

  // Kiểm tra SKU đã tồn tại chưa
  const skuExists = await Inventory.findOne({ sku });
  if (skuExists) {
    res.status(400);
    throw new Error('SKU đã tồn tại');
  }

  // Kiểm tra xem đã có mục tồn kho cho sản phẩm, kích cỡ và màu sắc này chưa
  const existingItem = await Inventory.findOne({ product, size, color });
  if (existingItem) {
    res.status(400);
    throw new Error('Đã tồn tại mục tồn kho cho sản phẩm, kích cỡ và màu sắc này');
  }

  // Tạo mục tồn kho mới
  const inventoryItem = await Inventory.create({
    product,
    size,
    color,
    quantity,
    reservedQuantity: 0,
    location,
    sku,
    lastUpdated: new Date(),
  });

  // Cập nhật tổng số lượng trong kho của sản phẩm
  await updateProductTotalStock(product);

  res.status(201).json({ success: true, data: inventoryItem });
});

// @desc    Lấy tất cả mục tồn kho
// @route   GET /api/inventory
// @access  Private/Admin
export const getAllInventory = asyncHandler(async (req: Request, res: Response) => {
  // Xử lý phân trang
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Xử lý lọc
  const filters: any = {};
  
  // Lọc theo sản phẩm
  if (req.query.product) {
    filters.product = req.query.product;
  }
  
  // Lọc theo size
  if (req.query.size) {
    filters.size = Number(req.query.size);
  }
  
  // Lọc theo màu sắc
  if (req.query.color) {
    filters.color = req.query.color;
  }
  
  // Lọc theo mức tồn kho thấp
  if (req.query.lowStock === 'true') {
    filters.quantity = { $lte: 5, $gt: 0 };
  }
  
  // Lọc theo hết hàng
  if (req.query.outOfStock === 'true') {
    filters.quantity = 0;
  }

  // Đếm tổng số mục
  const count = await Inventory.countDocuments(filters);

  // Lấy danh sách mục tồn kho
  const inventory = await Inventory.find(filters)
    .populate('product', 'name image brand category')
    .sort({ lastUpdated: -1 })
    .skip(skip)
    .limit(limit);

  res.json({ 
    success: true, 
    data: inventory,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    }
  });
});

// @desc    Lấy mục tồn kho theo ID
// @route   GET /api/inventory/:id
// @access  Private/Admin
export const getInventoryItemById = asyncHandler(async (req: Request, res: Response) => {
  const inventoryItem = await Inventory.findById(req.params.id).populate('product', 'name image brand category');
  
  if (!inventoryItem) {
    res.status(404);
    throw new Error('Không tìm thấy mục tồn kho');
  }
  
  res.json({ success: true, data: inventoryItem });
});

// @desc    Lấy tồn kho theo sản phẩm
// @route   GET /api/inventory/product/:productId
// @access  Private/Admin
export const getInventoryByProduct = asyncHandler(async (req: Request, res: Response) => {
  const productId = req.params.productId;

  // Kiểm tra sản phẩm có tồn tại không
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }

  const inventory = await Inventory.find({ product: productId }).sort({ size: 1, color: 1 });
  res.json({ success: true, data: inventory });
});

// @desc    Cập nhật mục tồn kho
// @route   PUT /api/inventory/:id
// @access  Private/Admin
export const updateInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const { quantity, reservedQuantity, location, sku } = req.body;

  // Tìm mục tồn kho
  const inventoryItem = await Inventory.findById(req.params.id);
  if (!inventoryItem) {
    res.status(404);
    throw new Error('Không tìm thấy mục tồn kho');
  }

  // Kiểm tra SKU đã tồn tại chưa
  if (sku && sku !== inventoryItem.sku) {
    const skuExists = await Inventory.findOne({ sku });
    if (skuExists && skuExists._id.toString() !== req.params.id) {
      res.status(400);
      throw new Error('SKU đã tồn tại');
    }
  }

  // Cập nhật thông tin
  if (quantity !== undefined) inventoryItem.quantity = quantity;
  if (reservedQuantity !== undefined) inventoryItem.reservedQuantity = reservedQuantity;
  if (location !== undefined) inventoryItem.location = location;
  if (sku) inventoryItem.sku = sku;
  inventoryItem.lastUpdated = new Date();

  const updatedItem = await inventoryItem.save();

  // Cập nhật tổng số lượng trong kho của sản phẩm
  await updateProductTotalStock(inventoryItem.product);

  res.json({ success: true, data: updatedItem });
});

// @desc    Xóa mục tồn kho
// @route   DELETE /api/inventory/:id
// @access  Private/Admin
export const deleteInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const inventoryItem = await Inventory.findById(req.params.id);
  if (!inventoryItem) {
    res.status(404);
    throw new Error('Không tìm thấy mục tồn kho');
  }

  const productId = inventoryItem.product;
  await inventoryItem.deleteOne();

  // Cập nhật tổng số lượng trong kho của sản phẩm
  await updateProductTotalStock(productId);

  res.json({ success: true, message: 'Mục tồn kho đã được xóa' });
});

// @desc    Kiểm tra tính khả dụng của sản phẩm
// @route   POST /api/inventory/check-availability
// @access  Public
export const checkAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { productId, size, color, quantity } = req.body;

  if (!productId || !size || !color || !quantity) {
    res.status(400);
    throw new Error('Vui lòng cung cấp đầy đủ thông tin sản phẩm, kích cỡ, màu sắc và số lượng');
  }

  // Tìm mục tồn kho phù hợp
  const inventoryItem = await Inventory.findOne({
    product: productId,
    size,
    color,
  });

  if (!inventoryItem) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm với kích cỡ và màu sắc này');
  }

  // Kiểm tra số lượng có sẵn
  const isAvailable = inventoryItem.isAvailable(Number(quantity));
  const availableQuantity = Math.max(0, inventoryItem.quantity - inventoryItem.reservedQuantity);

  res.json({
    success: true,
    data: {
      isAvailable,
      availableQuantity,
      requestedQuantity: Number(quantity),
    },
  });
});

// @desc    Cập nhật tồn kho hàng loạt
// @route   POST /api/inventory/bulk-update
// @access  Private/Admin
export const bulkUpdateInventory = asyncHandler(async (req: Request, res: Response) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('Vui lòng cung cấp danh sách mục cần cập nhật');
  }

  const updateResults = [];
  const productIds = new Set();

  for (const item of items) {
    const { id, quantity } = item;
    
    if (!id || quantity === undefined) {
      updateResults.push({
        id,
        success: false,
        message: 'Thiếu thông tin ID hoặc số lượng',
      });
      continue;
    }

    try {
      const inventoryItem = await Inventory.findById(id);
      
      if (!inventoryItem) {
        updateResults.push({
          id,
          success: false,
          message: 'Không tìm thấy mục tồn kho',
        });
        continue;
      }

      inventoryItem.quantity = Number(quantity);
      inventoryItem.lastUpdated = new Date();
      await inventoryItem.save();
      
      productIds.add(inventoryItem.product.toString());
      
      updateResults.push({
        id,
        success: true,
        data: {
          sku: inventoryItem.sku,
          quantity: inventoryItem.quantity
        }
      });
    } catch (error) {
      updateResults.push({
        id,
        success: false,
        message: `Lỗi: ${(error as Error).message}`,
      });
    }
  }

  // Cập nhật tổng số lượng của các sản phẩm bị ảnh hưởng
  for (const productId of productIds) {
    await updateProductTotalStock(new mongoose.Types.ObjectId(productId as string));
  }

  res.json({
    success: true,
    data: updateResults,
  });
});

// @desc    Đồng bộ tồn kho với sản phẩm
// @route   POST /api/inventory/sync/:productId
// @access  Private/Admin
export const syncProductInventory = asyncHandler(async (req: Request, res: Response) => {
  const productId = req.params.productId;
  
  // Kiểm tra sản phẩm có tồn tại không
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Không tìm thấy sản phẩm');
  }
  
  // Lấy các mục tồn kho hiện có của sản phẩm
  const existingItems = await Inventory.find({ product: productId });
  const existingCombinations = new Map();
  
  existingItems.forEach(item => {
    const key = `${item.size}-${item.color}`;
    existingCombinations.set(key, item);
  });
  
  // Tạo các mục tồn kho mới nếu cần
  const newItems = [];
  const updatedItems = [];
  
  for (const size of product.sizes) {
    for (const color of product.colors) {
      const key = `${size}-${color}`;
      
      if (existingCombinations.has(key)) {
        // Mục tồn kho đã tồn tại, không cần làm gì
        updatedItems.push(existingCombinations.get(key));
      } else {
        // Tạo mục tồn kho mới
        const sku = `${product.brand.substring(0, 3).toUpperCase()}-${productId.toString().substring(0, 5)}-${size}-${color.substring(0, 3).toUpperCase()}`;
        
        const newItem = await Inventory.create({
          product: new mongoose.Types.ObjectId(productId),
          size,
          color,
          quantity: 0,
          reservedQuantity: 0,
          sku,
          location: 'Kho A',
          lastUpdated: new Date()
        });
        
        newItems.push(newItem);
      }
    }
  }
  
  // Cập nhật tổng số lượng trong kho của sản phẩm
  await updateProductTotalStock(new mongoose.Types.ObjectId(productId));
  
  res.json({
    success: true,
    data: {
      existingItems: updatedItems,
      newItems,
      message: `Đã đồng bộ tồn kho cho sản phẩm: ${product.name}`
    }
  });
});

// Hàm hỗ trợ cập nhật tổng số lượng tồn kho của sản phẩm
const updateProductTotalStock = async (productId: mongoose.Types.ObjectId): Promise<void> => {
  const inventoryItems = await Inventory.find({ product: productId });
  const totalStock = inventoryItems.reduce((total, item) => total + item.quantity, 0);

  await Product.findByIdAndUpdate(productId, { countInStock: totalStock });
}; 