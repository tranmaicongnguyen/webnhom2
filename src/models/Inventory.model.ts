import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryItem extends Document {
  product: mongoose.Types.ObjectId;
  size: string;
  color: string;
  quantity: number;
  threshold: number; // Thêm trường này để cảnh báo khi tồn kho thấp
  reservedQuantity: number; // Số lượng đã đặt hàng nhưng chưa thanh toán
  location?: string; // Vị trí trong kho
  sku: string; // Stock Keeping Unit - mã quản lý tồn kho
  rack?: string; // Kệ hàng trong cửa hàng
  section?: string; // Khu vực trong kho
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
  isAvailable(requestedQuantity: number): boolean;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    size: {
      type: String,
      required: true,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    },
    color: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Số lượng không được âm'],
      default: 0,
    },
    threshold: {
      type: Number,
      default: 5,
      min: [1, 'Ngưỡng cảnh báo phải lớn hơn 0'],
    },
    reservedQuantity: {
      type: Number,
      min: [0, 'Số lượng đặt trước không được âm'],
      default: 0,
    },
    location: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    rack: {
      type: String,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Đảm bảo không có 2 mục tồn kho cùng sản phẩm, kích cỡ và màu sắc
InventoryItemSchema.index(
  { product: 1, size: 1, color: 1 },
  { unique: true }
);

// Tự động cập nhật lastUpdated khi có thay đổi
InventoryItemSchema.pre<IInventoryItem>('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

// Tính toán số lượng có sẵn thực tế
InventoryItemSchema.virtual('availableQuantity').get(function (this: IInventoryItem) {
  return Math.max(0, this.quantity - this.reservedQuantity);
});

// Kiểm tra xem sản phẩm có sẵn không
InventoryItemSchema.methods.isAvailable = function (requestedQuantity: number): boolean {
  return this.quantity - this.reservedQuantity >= requestedQuantity;
};

// Cập nhật số lượng đặt trước
InventoryItemSchema.methods.reserve = async function (quantity: number): Promise<IInventoryItem> {
  if (!this.isAvailable(quantity)) {
    throw new Error('Không đủ số lượng trong kho');
  }
  this.reservedQuantity += quantity;
  return this.save();
};

// Hoàn thành đơn hàng (giảm số lượng thực tế và đặt trước)
InventoryItemSchema.methods.fulfill = async function (quantity: number): Promise<IInventoryItem> {
  if (this.reservedQuantity < quantity) {
    throw new Error('Số lượng đặt trước không đủ');
  }
  if (this.quantity < quantity) {
    throw new Error('Số lượng trong kho không đủ');
  }
  this.reservedQuantity -= quantity;
  this.quantity -= quantity;
  return this.save();
};

// Hủy đặt trước
InventoryItemSchema.methods.cancelReservation = async function (quantity: number): Promise<IInventoryItem> {
  if (this.reservedQuantity < quantity) {
    throw new Error('Số lượng đặt trước không đủ');
  }
  this.reservedQuantity -= quantity;
  return this.save();
};

export default mongoose.model<IInventoryItem>('Inventory', InventoryItemSchema); 