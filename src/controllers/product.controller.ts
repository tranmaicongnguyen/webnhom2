import { Request, Response } from 'express';
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import Product from '../models/Product.model';
import Inventory from '../models/Inventory.model';
import { getImageUrl, deleteImage } from '../utils/upload.util';

// @desc    Lấy tất cả sản phẩm
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  // Xử lý các tham số truy vấn
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const keyword = req.query.keyword
    ? {
        name: {
          $regex: req.query.keyword,
          $options: 'i',
        },
      }
    : {};
  
  // Lọc theo danh mục và thương hiệu
  const categoryFilter = req.query.category ? { category: req.query.category } : {};
  const brandFilter = req.query.brand ? { brand: req.query.brand } : {};
  
  // Lọc theo giá
  const minPrice = req.query.min ? Number(req.query.min) : 0;
  const maxPrice = req.query.max ? Number(req.query.max) : Number.MAX_SAFE_INTEGER;
  const priceFilter = { price: { $gte: minPrice, $lte: maxPrice } };
  
  // Lọc theo giới tính
  const genderFilter = req.query.gender ? { gender: req.query.gender } : {};
  
  // Sắp xếp
  let sortOption = {};
  if (req.query.sort) {
    switch (req.query.sort) {
      case 'price':
        sortOption = { price: 1 };
        break;
      case 'price-desc':
        sortOption = { price: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'rating':
        sortOption = { rating: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }
  } else {
    sortOption = { createdAt: -1 };
  }
  
  // Tính toán skip để phân trang
  const skip = (page - 1) * limit;
  
  // Lọc sản phẩm nổi bật hoặc khuyến mãi
  const featuredFilter = req.query.featured === 'true' ? { isFeatured: true } : {};
  const discountFilter = req.query.discount === 'true' ? { isDiscounted: true } : {};
  
  // Kết hợp tất cả các filter
  const filter = {
    ...keyword,
    ...categoryFilter,
    ...brandFilter,
    ...priceFilter,
    ...featuredFilter,
    ...discountFilter,
    ...genderFilter,
  };
  
  // Đếm tổng số sản phẩm
  const count = await Product.countDocuments(filter);
  
  // Lấy sản phẩm
  const products = await Product.find(filter)
    .sort(sortOption)
    .limit(limit)
    .skip(skip)
    .select('-__v');
  
  res.json({
    success: true,
    data: products,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    },
  });
});

// @desc    Lấy sản phẩm theo ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id);
  
  if (product) {
    res.json({ success: true, data: product });
  } else {
    res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
  }
});

// @desc    Tạo sản phẩm mới
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const { 
    name, 
    brand, 
    category, 
    description, 
    price, 
    countInStock, 
    sizes, 
    colors, 
    isFeatured, 
    isDiscounted, 
    discountPercent,
    material,
    washingInstructions,
    style,
    gender,
    season,
    fit
  } = req.body;

  // Lấy URL hình ảnh từ file đã upload
  let imageUrl = '';
  if (req.file) {
    imageUrl = getImageUrl(req, req.file.filename);
  } else {
    res.status(400).json({ success: false, message: 'Vui lòng tải lên hình ảnh sản phẩm' });
    return;
  }

  // Tạo sản phẩm mới
  const product = await Product.create({
    name,
    user: req.user._id,
    image: imageUrl,
    brand,
    category,
    description,
    price: Number(price),
    countInStock: Number(countInStock) || 0,
    sizes: Array.isArray(sizes) ? sizes : sizes.split(',').map(s => s.trim()),
    colors: Array.isArray(colors) ? colors : colors.split(',').map(c => c.trim()),
    isFeatured: isFeatured === 'true' || isFeatured === true,
    isDiscounted: isDiscounted === 'true' || isDiscounted === true,
    discountPercent: Number(discountPercent) || 0,
    material: material || '',
    washingInstructions: washingInstructions || '',
    style: style || '',
    gender: gender || 'unisex',
    season: Array.isArray(season) ? season : season ? season.split(',').map(s => s.trim()) : [],
    fit: fit || 'regular',
  });

  // Tạo tồn kho cho từng size và màu sắc
  const inventoryItems = [];
  for (const size of product.sizes) {
    for (const color of product.colors) {
      const sku = `${product.brand.substring(0, 3).toUpperCase()}-${product._id.toString().substring(0, 5)}-${size}-${color.substring(0, 3).toUpperCase()}`;
      
      inventoryItems.push({
        product: product._id,
        size,
        color,
        quantity: Math.floor(countInStock / (product.sizes.length * product.colors.length)),
        reservedQuantity: 0,
        sku,
        location: 'Kho A',
        rack: 'R' + Math.floor(Math.random() * 10),
        section: product.gender === 'men' ? 'Nam' : product.gender === 'women' ? 'Nữ' : product.gender === 'kids' ? 'Trẻ em' : 'Unisex'
      });
    }
  }
  
  await Inventory.insertMany(inventoryItems);

  res.status(201).json({ success: true, data: product });
});

// @desc    Cập nhật sản phẩm
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { 
    name, 
    brand, 
    category, 
    description, 
    price, 
    countInStock, 
    sizes, 
    colors, 
    isFeatured, 
    isDiscounted, 
    discountPercent,
    material,
    washingInstructions,
    style,
    gender,
    season,
    fit
  } = req.body;

  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    return;
  }

  // Nếu có file mới, cập nhật hình ảnh
  let imageUrl = product.image;
  if (req.file) {
    // Xóa ảnh cũ nếu có
    if (product.image) {
      // Lấy tên file từ URL
      const oldImageFilename = product.image.split('/').pop();
      if (oldImageFilename) {
        deleteImage(oldImageFilename);
      }
    }
    
    // Cập nhật với ảnh mới
    imageUrl = getImageUrl(req, req.file.filename);
  }

  // Cập nhật thông tin sản phẩm
  product.name = name || product.name;
  product.image = imageUrl;
  product.brand = brand || product.brand;
  product.category = category || product.category;
  product.description = description || product.description;
  if (price) product.price = Number(price);
  if (countInStock !== undefined) product.countInStock = Number(countInStock);
  
  // Cập nhật sizes và colors nếu có thay đổi
  if (sizes) {
    product.sizes = Array.isArray(sizes) ? sizes : sizes.split(',').map(s => s.trim());
  }
  
  if (colors) {
    product.colors = Array.isArray(colors) ? colors : colors.split(',').map(c => c.trim());
  }
  
  product.isFeatured = isFeatured === 'true' || isFeatured === true;
  product.isDiscounted = isDiscounted === 'true' || isDiscounted === true;
  if (discountPercent !== undefined) product.discountPercent = Number(discountPercent);
  
  // Cập nhật các thuộc tính quần áo
  if (material) product.material = material;
  if (washingInstructions) product.washingInstructions = washingInstructions;
  if (style) product.style = style;
  if (gender) product.gender = gender;
  if (season) {
    product.season = Array.isArray(season) ? season : season.split(',').map(s => s.trim());
  }
  if (fit) product.fit = fit;

  const updatedProduct = await product.save();

  res.json({ success: true, data: updatedProduct });
});

// @desc    Xóa sản phẩm
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    return;
  }

  // Xóa hình ảnh của sản phẩm
  if (product.image) {
    const filename = product.image.split('/').pop();
    if (filename) {
      deleteImage(filename);
    }
  }

  // Xóa tồn kho liên quan
  await Inventory.deleteMany({ product: product._id });

  // Xóa sản phẩm
  await product.deleteOne();

  res.json({ success: true, message: 'Sản phẩm đã được xóa' });
});

// @desc    Lấy tất cả danh mục sản phẩm
// @route   GET /api/products/categories
// @access  Public
export const getProductCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await Product.distinct('category');
  res.json({ success: true, data: categories });
});

// @desc    Lấy tất cả thương hiệu sản phẩm
// @route   GET /api/products/brands
// @access  Public
export const getProductBrands = asyncHandler(async (req: Request, res: Response) => {
  const brands = await Product.distinct('brand');
  res.json({ success: true, data: brands });
});

// @desc    Kiểm tra tồn kho nhiều sản phẩm
// @route   POST /api/products/check-stock
// @access  Public
export const checkProductsStock = asyncHandler(async (req: Request, res: Response) => {
  const { productIds } = req.body;
  
  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ 
      success: false, 
      message: 'Danh sách ID sản phẩm không hợp lệ' 
    });
    return;
  }
  
  // Kiểm tra xem ID có hợp lệ không
  const validIds = productIds.filter(id => mongoose.Types.ObjectId.isValid(id));
  
  if (validIds.length === 0) {
    res.status(400).json({ 
      success: false, 
      message: 'Không có ID sản phẩm hợp lệ trong danh sách' 
    });
    return;
  }
  
  // Tìm kiếm tất cả sản phẩm theo ID
  const products = await Product.find({ 
    _id: { $in: validIds } 
  }).select('_id name countInStock sizes colors price');
  
  res.json({ 
    success: true, 
    data: products 
  });
}); 

// @desc    Lấy tất cả kiểu dáng quần áo
// @route   GET /api/products/styles
// @access  Public
export const getProductStyles = asyncHandler(async (req: Request, res: Response) => {
  const styles = await Product.distinct('style');
  res.json({ success: true, data: styles });
});

// @desc    Lấy tất cả giới tính sản phẩm
// @route   GET /api/products/genders
// @access  Public
export const getProductGenders = asyncHandler(async (req: Request, res: Response) => {
  const genders = await Product.distinct('gender');
  res.json({ success: true, data: genders });
});

// @desc    Lấy tất cả chất liệu sản phẩm
// @route   GET /api/products/materials
// @access  Public
export const getProductMaterials = asyncHandler(async (req: Request, res: Response) => {
  const materials = await Product.distinct('material');
  res.json({ success: true, data: materials });
}); 