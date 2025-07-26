import { Request, Response } from 'express';
import Review from '../models/Review.model';
import Product from '../models/Product.model';
import mongoose from 'mongoose';

// @desc    Tạo đánh giá mới cho sản phẩm
// @route   POST /api/products/:id/reviews
// @access  Private
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.id;

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      return;
    }

    // Kiểm tra nếu người dùng đã đánh giá sản phẩm này
    const existingReview = await Review.findOne({
      user: req.user?._id,
      product: productId,
    });

    if (existingReview) {
      res.status(400).json({ success: false, message: 'Bạn đã đánh giá sản phẩm này' });
      return;
    }

    // Tạo đánh giá mới
    const review = await Review.create({
      user: req.user?._id,
      product: productId,
      name: req.user?.name,
      rating: Number(rating),
      comment,
    });

    // Cập nhật số đánh giá và rating trung bình của sản phẩm
    const reviews = await Review.find({ product: productId });
    product.numReviews = reviews.length;
    product.rating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;
    await product.save();

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    console.error(`Lỗi tạo đánh giá: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy tất cả đánh giá của sản phẩm
// @route   GET /api/products/:id/reviews
// @access  Public
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      return;
    }

    const reviews = await Review.find({ product: productId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error(`Lỗi lấy đánh giá: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Cập nhật đánh giá của người dùng
// @route   PUT /api/products/:id/reviews/:reviewId
// @access  Private
export const updateReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rating, comment } = req.body;
    const { id: productId, reviewId } = req.params;

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      return;
    }

    // Tìm đánh giá
    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
      return;
    }

    // Kiểm tra quyền sở hữu đánh giá
    if (review.user.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật đánh giá này' });
      return;
    }

    // Cập nhật đánh giá
    review.rating = Number(rating) || review.rating;
    review.comment = comment || review.comment;
    await review.save();

    // Cập nhật rating trung bình của sản phẩm
    const reviews = await Review.find({ product: productId });
    product.rating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;
    await product.save();

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    console.error(`Lỗi cập nhật đánh giá: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Xóa đánh giá
// @route   DELETE /api/products/:id/reviews/:reviewId
// @access  Private
export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: productId, reviewId } = req.params;

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      return;
    }

    // Tìm đánh giá
    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
      return;
    }

    // Kiểm tra quyền sở hữu đánh giá hoặc admin
    if (review.user.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Bạn không có quyền xóa đánh giá này' });
      return;
    }

    // Xóa đánh giá
    await review.deleteOne();

    // Cập nhật rating trung bình và số lượng đánh giá của sản phẩm
    const reviews = await Review.find({ product: productId });
    product.numReviews = reviews.length;
    product.rating = reviews.length > 0
      ? reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length
      : 0;
    await product.save();

    res.status(200).json({ success: true, message: 'Đánh giá đã được xóa' });
  } catch (error) {
    console.error(`Lỗi xóa đánh giá: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
}; 