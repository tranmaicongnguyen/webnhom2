import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  user: mongoose.Types.ObjectId;
  image: string;
  brand: string;
  category: string;
  description: string;
  rating: number;
  numReviews: number;
  price: number;
  countInStock: number;
  sizes: string[];
  colors: string[];
  isFeatured: boolean;
  isDiscounted: boolean;
  discountPercent: number;
  material: string;
  washingInstructions: string;
  style: string;
  gender: 'men' | 'women' | 'unisex' | 'kids';
  season: string[];
  fit: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Tên sản phẩm không được bỏ trống'],
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    image: {
      type: String,
      required: [true, 'Hình ảnh sản phẩm không được bỏ trống'],
    },
    brand: {
      type: String,
      required: [true, 'Thương hiệu không được bỏ trống'],
    },
    category: {
      type: String,
      required: [true, 'Danh mục không được bỏ trống'],
    },
    description: {
      type: String,
      required: [true, 'Mô tả sản phẩm không được bỏ trống'],
    },
    rating: {
      type: Number,
      required: true,
      default: 0,
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'Giá sản phẩm không được bỏ trống'],
      default: 0,
      min: [0, 'Giá sản phẩm không được âm'],
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Số lượng trong kho không được âm'],
    },
    sizes: {
      type: [String],
      required: true,
      default: [],
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    },
    colors: {
      type: [String],
      required: true,
      default: [],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isDiscounted: {
      type: Boolean,
      default: false,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: [0, 'Phần trăm giảm giá không được âm'],
      max: [100, 'Phần trăm giảm giá không được vượt quá 100%'],
    },
    material: {
      type: String,
      default: '',
    },
    washingInstructions: {
      type: String,
      default: '',
    },
    style: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      enum: ['men', 'women', 'unisex', 'kids'],
      default: 'unisex',
    },
    season: {
      type: [String],
      default: [],
    },
    fit: {
      type: String,
      enum: ['regular', 'slim', 'oversized', 'loose', 'skinny'],
      default: 'regular',
    },
  },
  {
    timestamps: true,
  }
);

// Tính giá sau khi giảm giá
ProductSchema.virtual('discountedPrice').get(function (this: IProduct) {
  if (!this.isDiscounted || this.discountPercent === 0) {
    return this.price;
  }
  return this.price * (1 - this.discountPercent / 100);
});

export default mongoose.model<IProduct>('Product', ProductSchema); 