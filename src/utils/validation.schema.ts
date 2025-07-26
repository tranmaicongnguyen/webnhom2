import Joi from 'joi';

// User Schemas
export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.base': 'Tên phải là chuỗi',
    'string.min': 'Tên phải có ít nhất {#limit} ký tự',
    'string.max': 'Tên không được vượt quá {#limit} ký tự',
    'any.required': 'Tên là bắt buộc',
  }),
  email: Joi.string().email().required().messages({
    'string.base': 'Email phải là chuỗi',
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
  password: Joi.string().min(6).required().messages({
    'string.base': 'Mật khẩu phải là chuỗi',
    'string.min': 'Mật khẩu phải có ít nhất {#limit} ký tự',
    'any.required': 'Mật khẩu là bắt buộc',
  }),
  phone: Joi.string().allow('').optional().messages({
    'string.base': 'Số điện thoại phải là chuỗi',
  }),
  address: Joi.string().allow('').optional().messages({
    'string.base': 'Địa chỉ phải là chuỗi',
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.base': 'Email phải là chuỗi',
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
  password: Joi.string().required().messages({
    'string.base': 'Mật khẩu phải là chuỗi',
    'any.required': 'Mật khẩu là bắt buộc',
  }),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional().messages({
    'string.base': 'Tên phải là chuỗi',
    'string.min': 'Tên phải có ít nhất {#limit} ký tự',
    'string.max': 'Tên không được vượt quá {#limit} ký tự',
  }),
  phone: Joi.string().allow('').optional().messages({
    'string.base': 'Số điện thoại phải là chuỗi',
  }),
  address: Joi.string().allow('').optional().messages({
    'string.base': 'Địa chỉ phải là chuỗi',
  }),
});

// Product Schemas
export const productSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    'string.base': 'Tên sản phẩm phải là chuỗi',
    'string.min': 'Tên sản phẩm phải có ít nhất {#limit} ký tự',
    'string.max': 'Tên sản phẩm không được vượt quá {#limit} ký tự',
    'any.required': 'Tên sản phẩm là bắt buộc',
  }),
  description: Joi.string().required().messages({
    'string.base': 'Mô tả sản phẩm phải là chuỗi',
    'any.required': 'Mô tả sản phẩm là bắt buộc',
  }),
  price: Joi.number().min(0).required().messages({
    'number.base': 'Giá sản phẩm phải là số',
    'number.min': 'Giá sản phẩm không được âm',
    'any.required': 'Giá sản phẩm là bắt buộc',
  }),
  image: Joi.string().required().messages({
    'string.base': 'Hình ảnh sản phẩm phải là chuỗi',
    'any.required': 'Hình ảnh sản phẩm là bắt buộc',
  }),
  brand: Joi.string().required().messages({
    'string.base': 'Thương hiệu phải là chuỗi',
    'any.required': 'Thương hiệu là bắt buộc',
  }),
  category: Joi.string().required().messages({
    'string.base': 'Danh mục phải là chuỗi',
    'any.required': 'Danh mục là bắt buộc',
  }),
  sizes: Joi.array().items(Joi.string()).required().messages({
    'array.base': 'Kích cỡ phải là mảng',
    'any.required': 'Kích cỡ là bắt buộc',
  }),
  colors: Joi.array().items(Joi.string()).required().messages({
    'array.base': 'Màu sắc phải là mảng',
    'any.required': 'Màu sắc là bắt buộc',
  }),
  countInStock: Joi.number().min(0).required().messages({
    'number.base': 'Số lượng trong kho phải là số',
    'number.min': 'Số lượng trong kho không được âm',
    'any.required': 'Số lượng trong kho là bắt buộc',
  }),
  isFeatured: Joi.boolean().optional(),
  isDiscounted: Joi.boolean().optional(),
  discountPercent: Joi.number().min(0).max(100).optional().messages({
    'number.base': 'Phần trăm giảm giá phải là số',
    'number.min': 'Phần trăm giảm giá không được âm',
    'number.max': 'Phần trăm giảm giá không được vượt quá 100',
  }),
});

// Review Schema
export const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required().messages({
    'number.base': 'Đánh giá phải là số',
    'number.min': 'Đánh giá phải từ 1 đến 5',
    'number.max': 'Đánh giá phải từ 1 đến 5',
    'any.required': 'Đánh giá là bắt buộc',
  }),
  comment: Joi.string().required().messages({
    'string.base': 'Bình luận phải là chuỗi',
    'any.required': 'Bình luận là bắt buộc',
  }),
});


// Inventory Schema
export const inventorySchema = Joi.object({
  product: Joi.string().required().messages({
    'string.base': 'ID sản phẩm phải là chuỗi',
    'any.required': 'ID sản phẩm là bắt buộc',
  }),
  size: Joi.string().required().messages({
    'string.base': 'Kích cỡ phải là chuỗi',
    'any.required': 'Kích cỡ là bắt buộc',
  }),
  color: Joi.string().required().messages({
    'string.base': 'Màu sắc phải là chuỗi',
    'any.required': 'Màu sắc là bắt buộc',
  }),
  quantity: Joi.number().min(0).required().messages({
    'number.base': 'Số lượng phải là số',
    'number.min': 'Số lượng không được âm',
    'any.required': 'Số lượng là bắt buộc',
  }),
  reservedQuantity: Joi.number().min(0).messages({
    'number.base': 'Số lượng đặt trước phải là số',
    'number.min': 'Số lượng đặt trước không được âm',
  }),
  location: Joi.string().allow('').optional().messages({
    'string.base': 'Vị trí phải là chuỗi',
  }),
  sku: Joi.string().required().messages({
    'string.base': 'SKU phải là chuỗi',
    'any.required': 'SKU là bắt buộc',
  }),
});

// Order Schemas
export const orderSchema = Joi.object({
  orderItems: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().required().messages({
          'string.base': 'ID sản phẩm phải là chuỗi',
          'any.required': 'ID sản phẩm là bắt buộc',
        }),
        name: Joi.string().required().messages({
          'string.base': 'Tên sản phẩm phải là chuỗi',
          'any.required': 'Tên sản phẩm là bắt buộc',
        }),
        quantity: Joi.number().integer().min(1).required().messages({
          'number.base': 'Số lượng phải là số',
          'number.integer': 'Số lượng phải là số nguyên',
          'number.min': 'Số lượng phải lớn hơn 0',
          'any.required': 'Số lượng là bắt buộc',
        }),
        image: Joi.string().required().messages({
          'string.base': 'Hình ảnh sản phẩm phải là chuỗi',
          'any.required': 'Hình ảnh sản phẩm là bắt buộc',
        }),
        price: Joi.number().min(0).required().messages({
          'number.base': 'Giá sản phẩm phải là số',
          'number.min': 'Giá sản phẩm không được âm',
          'any.required': 'Giá sản phẩm là bắt buộc',
        }),
        size: Joi.alternatives().try(Joi.string(), Joi.number()).required().messages({
          'alternatives.base': 'Kích cỡ phải là chuỗi hoặc số',
          'any.required': 'Kích cỡ là bắt buộc',
        }),
        color: Joi.string().required().messages({
          'string.base': 'Màu sắc phải là chuỗi',
          'any.required': 'Màu sắc là bắt buộc',
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.base': 'Đơn hàng phải là mảng các sản phẩm',
      'array.min': 'Đơn hàng phải có ít nhất một sản phẩm',
      'any.required': 'Đơn hàng là bắt buộc',
    }),
  shippingAddress: Joi.object({
    fullName: Joi.string().required().messages({
      'string.base': 'Tên đầy đủ phải là chuỗi',
      'any.required': 'Tên đầy đủ là bắt buộc',
    }),
    address: Joi.string().required().messages({
      'string.base': 'Địa chỉ phải là chuỗi',
      'any.required': 'Địa chỉ là bắt buộc',
    }),
    city: Joi.string().required().messages({
      'string.base': 'Thành phố phải là chuỗi',
      'any.required': 'Thành phố là bắt buộc',
    }),
    phone: Joi.string().required().messages({
      'string.base': 'Số điện thoại phải là chuỗi',
      'any.required': 'Số điện thoại là bắt buộc',
    }),
  }).required().messages({
    'object.base': 'Địa chỉ giao hàng phải là đối tượng',
    'any.required': 'Địa chỉ giao hàng là bắt buộc',
  }),
  paymentMethod: Joi.string().required().messages({
    'string.base': 'Phương thức thanh toán phải là chuỗi',
    'any.required': 'Phương thức thanh toán là bắt buộc',
  }),
  itemsPrice: Joi.number().min(0).required().messages({
    'number.base': 'Giá sản phẩm phải là số',
    'number.min': 'Giá sản phẩm không được âm',
    'any.required': 'Giá sản phẩm là bắt buộc',
  }),
  shippingPrice: Joi.number().min(0).required().messages({
    'number.base': 'Phí vận chuyển phải là số',
    'number.min': 'Phí vận chuyển không được âm',
    'any.required': 'Phí vận chuyển là bắt buộc',
  }),
  totalPrice: Joi.number().min(0).required().messages({
    'number.base': 'Tổng giá phải là số',
    'number.min': 'Tổng giá không được âm',
    'any.required': 'Tổng giá là bắt buộc',
  }),
 
  discountAmount: Joi.number().min(0).optional().messages({
    'number.base': 'Số tiền giảm giá phải là số',
    'number.min': 'Số tiền giảm giá không được âm',
  }),
}); 