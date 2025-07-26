import mongoose, { Document, Schema } from 'mongoose';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.config';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  isAdmin: boolean;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
  generateToken(): string;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Tên không được bỏ trống'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email không được bỏ trống'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ'],
    },
    password: {
      type: String,
      required: [true, 'Mật khẩu không được bỏ trống'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Mã hóa mật khẩu trước khi lưu
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    next();
    return;
  }

  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hash(this.password, salt);
  next();
});

// Đồng bộ trường role và isAdmin
UserSchema.pre<IUser>('save', function (next) {
  // Nếu role là admin, đặt isAdmin là true
  if (this.role === 'admin') {
    this.isAdmin = true;
  } else {
    this.isAdmin = false;
  }
  next();
});

// Phương thức kiểm tra mật khẩu
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// Phương thức tạo JWT token
UserSchema.methods.generateToken = function (): string {
  // Sửa lại cách tạo JWT token để tránh lỗi TypeScript
  return jwt.sign(
    { id: this._id }, 
    env.jwtSecret, 
    { expiresIn: env.jwtExpiresIn }
  );
};

export default mongoose.model<IUser>('User', UserSchema); 