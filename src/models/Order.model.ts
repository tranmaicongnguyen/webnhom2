import mongoose, { Document, Schema } from 'mongoose';

export interface OrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  image: string;
  price: number;
  size: number | string;
  color: string;
}

export interface ShippingAddress {
  fullName: string;
  address: string;
  city: string;
  phone: string;
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  orderItems: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentResult?: {
    id: string;
    status: string;
    update_time: string;
    email_address: string;
    reference: string;
  };
  itemsPrice: number;
  shippingPrice: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: Date;
  isDelivered: boolean;
  deliveredAt?: Date;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    _id: {
      type: String,
      default: function() {
        // Tạo mã đơn hàng có tiền tố "ORD" và số ngẫu nhiên
        const randomNum = Math.floor(10000000 + Math.random() * 90000000);
        return `ORD${randomNum}`;
      }
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderItems: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Số lượng sản phẩm phải lớn hơn 0'],
        },
        image: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Giá sản phẩm không được âm'],
        },
        size: {
          type: Schema.Types.Mixed,
          required: true,
        },
        color: {
          type: String,
          required: true,
        },
      },
    ],
    shippingAddress: {
      fullName: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'bank', 'sepay'],
      required: true,
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
      reference: { type: String },
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0, 'Giá sản phẩm không được âm'],
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0, 'Phí vận chuyển không được âm'],
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0, 'Tổng giá không được âm'],
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IOrder>('Order', OrderSchema); 