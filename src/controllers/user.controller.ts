import { Request, Response } from 'express';
import User, { IUser } from '../models/User.model';
import jwt from 'jsonwebtoken';
import env from '../config/env.config';

// Helper để tạo token
const generateToken = (id: string): string => {
  return jwt.sign({ id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
};

// @desc    Đăng ký người dùng mới
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, address } = req.body;

    // Kiểm tra email đã tồn tại chưa
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
      return;
    }

    // Tạo người dùng mới
    const user = await User.create({
      name,
      email,
      password,
      phone,
      address,
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          token: generateToken(user._id.toString()),
        },
      });
    }
  } catch (error) {
    console.error(`Lỗi đăng ký: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Đăng nhập người dùng
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Kiểm tra user tồn tại
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
      return;
    }

    // Kiểm tra mật khẩu
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        token: generateToken(user._id.toString()),
      },
    });
  } catch (error) {
    console.error(`Lỗi đăng nhập: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy thông tin người dùng
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Sử dụng as IUser để xác định kiểu dữ liệu
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (error) {
    console.error(`Lỗi lấy thông tin người dùng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Cập nhật thông tin người dùng
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    // Cập nhật thông tin
    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    user.address = req.body.address || user.address;

    // Cập nhật mật khẩu nếu có
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: updatedUser.address,
        token: generateToken(updatedUser._id.toString()),
      },
    });
  } catch (error) {
    console.error(`Lỗi cập nhật thông tin người dùng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy danh sách người dùng
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error(`Lỗi lấy danh sách người dùng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Lấy thông tin người dùng theo ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(`Lỗi lấy thông tin người dùng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Cập nhật người dùng
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
    user.phone = req.body.phone || user.phone;
    user.address = req.body.address || user.address;

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: updatedUser.address,
      },
    });
  } catch (error) {
    console.error(`Lỗi cập nhật người dùng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Xóa người dùng
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    await user.deleteOne();
    res.status(200).json({ success: true, message: 'Người dùng đã được xóa' });
  } catch (error) {
    console.error(`Lỗi xóa người dùng: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
}; 