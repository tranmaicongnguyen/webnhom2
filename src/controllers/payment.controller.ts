import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.model';
import { createSepayPayment, verifySepayWebhook, checkSepayPaymentStatus, createSepayQRCode, checkSepayQRStatus } from '../utils/sepay.utils';
import mongoose from 'mongoose';
import sepayConfig from '../config/sepay.config';
import axios from 'axios';


export const checkPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log(`Checking payment status for order ID: ${req.params.id}`);
    
    // Chuẩn hóa orderId
    let orderId = req.params.id;
    
    // Kiểm tra nếu orderId không có tiền tố "ORD", thêm vào
    if (!orderId.startsWith('ORD')) {
      orderId = `ORD${orderId}`;
      console.log(`Normalized order ID to: ${orderId}`);
    }
    
    // Tìm đơn hàng với ID đã chuẩn hóa
    const order = await Order.findById(orderId);
    
    if (!order) {
      console.log(`Order not found with ID: ${orderId}`);
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
      return;
    }
    
    console.log(`Order found: ${order._id}, isPaid: ${order.isPaid}`);
    
    res.status(200).json({
      success: true,
      isPaid: order.isPaid,
      paidAt: order.paidAt,
      paymentResult: order.paymentResult,
    });
  } catch (error) {
    console.error(`Error checking payment status: ${(error as Error).message}`);
    res.status(500).json({
      success: false,
      message: `Lỗi khi kiểm tra trạng thái thanh toán: ${(error as Error).message}`
    });
  }
});

/**
 * @desc    Tạo thanh toán qua Sepay
 * @route   POST /api/payments/sepay
 * @access  Private
 */
export const createSepayPaymentController = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { orderId, customerInfo } = req.body;

    if (!orderId) {
      res.status(400);
      throw new Error('Mã đơn hàng không được bỏ trống');
    }

    // Kiểm tra orderId có phải ObjectId hợp lệ
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      res.status(400);
      throw new Error('Mã đơn hàng không hợp lệ');
    }

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng');
    }

    // Kiểm tra đơn hàng đã thanh toán chưa
    if (order.isPaid) {
      res.status(400);
      throw new Error('Đơn hàng đã được thanh toán');
    }

    // Kiểm tra số tiền
    if (order.totalPrice <= 0) {
      res.status(400);
      throw new Error('Số tiền thanh toán không hợp lệ');
    }

    // Thông tin người dùng
    const user = req.user as any;
    const customerName = customerInfo?.name || user?.name || '';
    const customerEmail = customerInfo?.email || user?.email || '';
    const customerPhone = customerInfo?.phone || user?.phone || '';

    // Tạo thanh toán Sepay
    const paymentResult = await createSepayPayment({
      orderId: order._id.toString(),
      amount: order.totalPrice,
      description: `Thanh toán đơn hàng #${order._id}`,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl: `http://localhost:3000/payment/success?orderId=${order._id}`,
      cancelUrl: `http://localhost:3000/payment/error?orderId=${order._id}`
    });

    // Cập nhật phương thức thanh toán thành sepay
    order.paymentMethod = 'sepay';
    await order.save();

    res.status(200).json({
      success: true,
      paymentUrl: paymentResult.data.payment_url,
      transactionId: paymentResult.data.transaction_id,
      orderCode: paymentResult.txnRef
    });
  } catch (error) {
    console.error('Error creating Sepay payment:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi tạo thanh toán Sepay: ${(error as Error).message}`
    });
  }
});

/**
 * @desc    Xử lý webhook từ Sepay
 * @route   POST /api/payments/sepay-webhook, /api/payments/webhook/sepay
 * @access  Public
 */
export const sepayWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // Lấy chữ ký từ header
    const signature = req.headers['x-sepay-signature'] as string;
    const payload = req.body;

    console.log('SEPay webhook received - URL:', req.originalUrl);
    console.log('SEPay webhook headers:', JSON.stringify(req.headers, null, 2));
    console.log('SEPay webhook body:', JSON.stringify(payload, null, 2));

    // Nếu không có chữ ký, vẫn tiếp tục xử lý trong môi trường phát triển
    if (!signature) {
      console.warn('Missing signature in SEPay webhook, still processing in development');
    }

    // Xác thực chữ ký nếu có
    let isValid = true;
    if (signature) {
      isValid = verifySepayWebhook(payload, signature);
      if (!isValid) {
        console.error('Invalid SEPay webhook signature');
      }
    }

    // Xử lý sự kiện từ Sepay
    const { event, data } = payload;
    console.log('SEPay webhook event:', event);

    // Xử lý webhook từ ngân hàng (VietinBank, etc.)
    // Các webhook này không có trường event, mà có trường content chứa nội dung chuyển khoản
    if (!event && payload.content) {
      console.log('Bank transaction webhook received');
      
      const bankContent = payload.content;
      console.log('Bank content:', bankContent);
      
      // Tìm reference trong nội dung chuyển khoản
      // Mẫu: "CT DEN:515519002340 SEVQR1748977391356ORD27133918"
      const contentParts = bankContent.split(' ');
      let referenceWithOrderId = '';
      
      for (const part of contentParts) {
        if (part.includes('SEVQR') && part.includes('ORD')) {
          referenceWithOrderId = part;
          break;
        }
      }
      
      if (!referenceWithOrderId) {
        console.error('Cannot find reference in bank content');
        res.status(200).json({ success: false, message: 'Không tìm thấy mã tham chiếu trong nội dung chuyển khoản' });
        return;
      }
      
      console.log('Found reference in content:', referenceWithOrderId);
      
      // Trích xuất orderId từ reference
      // SEVQR1748977391356ORD27133918 -> ORD27133918
      let orderId = '';
      const ordMatch = referenceWithOrderId.match(/ORD\d+/);
      if (ordMatch) {
        orderId = ordMatch[0];
      }
      
      if (!orderId) {
        console.error('Cannot extract order ID from reference:', referenceWithOrderId);
        res.status(200).json({ success: false, message: 'Không thể trích xuất mã đơn hàng từ nội dung chuyển khoản' });
        return;
      }
      
      console.log('Extracted order ID:', orderId);
      
      // Tìm đơn hàng theo ID
      const order = await Order.findById(orderId);
      
      if (!order) {
        console.error('Order not found:', orderId);
        res.status(200).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        return;
      }
      
      // Kiểm tra đơn hàng đã thanh toán chưa
      if (order.isPaid) {
        console.log('Order already paid:', orderId);
        res.status(200).json({ success: true, message: 'Đơn hàng đã được thanh toán trước đó' });
        return;
      }
      
      // Kiểm tra số tiền nếu có
      const transferAmount = payload.transferAmount;
      if (transferAmount && Math.abs(order.totalPrice - transferAmount) > 5000) {
        console.warn(`Amount mismatch: Order=${order.totalPrice}, Bank=${transferAmount}`);
        // Vẫn tiếp tục xử lý nhưng ghi log
        console.warn('Continuing payment processing despite amount mismatch');
      }
      
      // Cập nhật đơn hàng thành đã thanh toán
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentResult = {
        id: payload.referenceCode || `BANK_${Date.now()}`,
        status: 'success',
        update_time: new Date().toISOString(),
        email_address: '',
        reference: referenceWithOrderId
      };
      
      await order.save();
      
      console.log('Order payment updated successfully (bank webhook):', orderId);
      res.status(200).json({ success: true, message: 'Cập nhật thanh toán thành công' });
      return;
    }

    if (event === 'payment.success' || event === 'qr.payment.completed' || event === 'transaction.completed') {
      // Thanh toán thành công
      console.log('SEPay payment success event received');
      
      // Lấy dữ liệu từ payload
      const { transaction_id, order_code, reference, amount } = data;
      
      // Lấy orderId từ order_code hoặc reference
      let orderId = null;
      
      if (order_code) {
        orderId = order_code.split('_').pop();
      } else if (reference) {
        orderId = reference.split('_').pop();
      } else if (data.orderId) {
        orderId = data.orderId;
      } else if (data.order_id) {
        orderId = data.order_id;
      }
      
      if (!orderId) {
        console.error('Order ID not found in webhook data');
        res.status(200).json({ success: false, message: 'Không tìm thấy mã đơn hàng' });
        return;
      }
      
      console.log('SEPay successful payment - OrderID:', orderId, 'Amount:', amount);
      
      try {
        // Tìm đơn hàng
        const order = await Order.findById(orderId);
        
        if (!order) {
          console.error('Order not found:', orderId);
          res.status(200).json({ success: false, message: 'Không tìm thấy đơn hàng' });
          return;
        }
        
        // Kiểm tra đơn hàng đã thanh toán chưa
        if (order.isPaid) {
          console.log('Order already paid:', orderId);
          res.status(200).json({ success: true, message: 'Đơn hàng đã được thanh toán trước đó' });
          return;
        }
        
        // Kiểm tra số tiền nếu có
        if (amount && Math.abs(order.totalPrice - amount) > 5000) {
          console.error(`Amount mismatch: Order=${order.totalPrice}, SEPay=${amount}`);
          // Vẫn tiếp tục xử lý nhưng ghi log
          console.warn('Continuing payment processing despite amount mismatch');
        }
        
        // Cập nhật đơn hàng
        order.isPaid = true;
        order.paidAt = new Date();
        order.paymentResult = {
          id: transaction_id || reference || `SEPAY_${Date.now()}`,
          status: 'success',
          update_time: new Date().toISOString(),
          email_address: data.customer_email || '',
          reference: reference || order_code || ''
        };
        
        await order.save();
        
        console.log('Order payment updated successfully:', orderId);
        res.status(200).json({ success: true, message: 'Cập nhật thanh toán thành công' });
        return;
      } catch (dbError) {
        console.error('Database error when processing webhook:', dbError);
        res.status(200).json({ success: false, message: 'Lỗi cơ sở dữ liệu khi xử lý webhook' });
        return;
      }
    } else if (event === 'payment.failed' || event === 'qr.payment.failed' || event === 'transaction.failed') {
      // Thanh toán thất bại - ghi log
      console.error('SEPay payment failed:', data);
      res.status(200).json({ success: true, message: 'Đã ghi nhận thất bại thanh toán' });
      return;
    } else if (event === 'qr.payment.expired') {
      // Mã QR hết hạn
      console.log('SEPay QR code expired:', data);
      res.status(200).json({ success: true, message: 'Đã ghi nhận mã QR hết hạn' });
      return;
    }

    // Luôn trả về 200 để SEPay biết webhook đã nhận thành công
    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Error processing SEPay webhook:', error);
    // Vẫn trả về 200 để SEPay không gửi lại webhook
    res.status(200).json({ success: false, message: (error as Error).message });
  }
});

/**
 * @desc    Kiểm tra trạng thái thanh toán Sepay
 * @route   GET /api/payments/sepay-status/:transactionId
 * @access  Private
 */
export const checkSepayStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    
    if (!transactionId) {
      res.status(400);
      throw new Error('Mã giao dịch không được bỏ trống');
    }
    
    const result = await checkSepayPaymentStatus(transactionId);
    
    res.status(200).json({
      success: true,
      ...result.data
    });
  } catch (error) {
    console.error('Error checking Sepay payment status:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi kiểm tra trạng thái thanh toán Sepay: ${(error as Error).message}`
    });
  }
});

/**
 * @desc    Kiểm tra trạng thái server Sepay
 * @route   GET /api/payments/sepay-server-status
 * @access  Public
 */
export const checkSepayServerStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Kiểm tra kết nối đến server Sepay
    const response = await axios.get(`${sepayConfig.API_URL}/health`, {
      timeout: 5000, // 5 giây timeout
    });
    
    res.status(200).json({
      success: true,
      message: 'Kết nối đến server Sepay thành công',
      status: response.status,
      config: {
        apiUrl: sepayConfig.API_URL,
        apiKey: `${sepayConfig.API_KEY.substring(0, 5)}...`,
        accountNumber: sepayConfig.ACCOUNT_NUMBER,
        bankCode: sepayConfig.BANK_CODE,
      }
    });
  } catch (error: any) {
    console.error('Lỗi kết nối đến server Sepay:', error.message);
    
    res.status(200).json({
      success: false,
      message: `Không thể kết nối đến server Sepay: ${error.message}`,
      error: error.message,
      config: {
        apiUrl: sepayConfig.API_URL,
        apiKey: `${sepayConfig.API_KEY.substring(0, 5)}...`,
        accountNumber: sepayConfig.ACCOUNT_NUMBER,
        bankCode: sepayConfig.BANK_CODE,
      }
    });
  }
});

/**
 * @desc    Tạo mã QR Sepay
 * @route   POST /api/payments/sepay-qr
 * @access  Private
 */
export const createSepayQRController = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400);
      throw new Error('Mã đơn hàng không được bỏ trống');
    }

    console.log('Đang tạo QR cho đơn hàng:', orderId);

    // Tìm đơn hàng - Không kiểm tra ObjectId vì model Order dùng String làm ID
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng');
    }

    // Kiểm tra đơn hàng đã thanh toán chưa
    if (order.isPaid) {
      res.status(400);
      throw new Error('Đơn hàng đã được thanh toán');
    }

    // Kiểm tra số tiền
    if (order.totalPrice <= 0) {
      res.status(400);
      throw new Error('Số tiền thanh toán không hợp lệ');
    }

    // Tạo mã QR Sepay
    const qrResult = await createSepayQRCode({
      orderId: order._id.toString(),
      amount: order.totalPrice,
      description: `Thanh toán đơn hàng #${order._id}`
    });

    // Cập nhật phương thức thanh toán và lưu reference
    order.paymentMethod = 'sepay';
    
    // Khởi tạo đầy đủ paymentResult để tránh lỗi TypeScript
    order.paymentResult = {
      id: `SEPAY_${Date.now()}`, // Tạo ID tạm thời
      status: 'pending',
      update_time: new Date().toISOString(),
      email_address: '',
      reference: qrResult.reference
    };
    
    await order.save();

    // Trả về thông tin đầy đủ cho frontend
    res.status(200).json({
      success: true,
      qrCodeUrl: qrResult.data.qr_image,
      qrCode: qrResult.data.qr_code,
      reference: qrResult.reference,
      bankInfo: {
        bankName: sepayConfig.BANK_NAME,
        bankCode: sepayConfig.BANK_CODE,
        accountName: sepayConfig.ACCOUNT_NAME,
        accountNumber: sepayConfig.ACCOUNT_NUMBER,
        content: qrResult.reference
      },
      amount: order.totalPrice,
      orderId: order._id
    });
  } catch (error) {
    console.error('Error creating Sepay QR code:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi tạo mã QR Sepay: ${(error as Error).message}`
    });
  }
});

/**
 * @desc    Kiểm tra trạng thái thanh toán QR Sepay
 * @route   GET /api/payments/sepay-qr/:reference
 * @access  Private
 */
export const checkSepayQRController = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      res.status(400);
      throw new Error('Mã tham chiếu không được bỏ trống');
    }
    
    // Kiểm tra trạng thái thanh toán
    const result = await checkSepayQRStatus(reference);
    
    // Nếu đã thanh toán, cập nhật đơn hàng
    if (result.isPaid) {
      // Tìm đơn hàng có reference này
      const orderId = reference.split('_').pop();
      if (orderId) {
        const order = await Order.findById(orderId);
        
        if (order && !order.isPaid) {
          order.isPaid = true;
          order.paidAt = new Date();
          order.paymentResult = {
            id: result.transactionId || reference,
            status: 'success',
            update_time: new Date().toISOString(),
            email_address: '', // Thêm email_address trống
            reference: reference
          };
          
          await order.save();
          console.log('Order updated after QR payment:', orderId);
        } else if (order && order.isPaid) {
          console.log('Order already paid (QR check):', orderId);
        }
      }
    }
    
    res.status(200).json({
      success: true,
      isPaid: result.isPaid,
      status: result.status,
      transaction: result.transactionId,
      paymentTime: result.paymentTime
    });
  } catch (error) {
    console.error('Error checking Sepay QR status:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi kiểm tra trạng thái mã QR Sepay: ${(error as Error).message}`
    });
  }
});

/**
 * @desc    Tạo thanh toán COD (Cash on Delivery)
 * @route   POST /api/payments/cod
 * @access  Private
 */
export const createCODPayment = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400);
      throw new Error('Mã đơn hàng không được bỏ trống');
    }

    console.log('Đang tạo thanh toán COD cho đơn hàng:', orderId);

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng');
    }

    // Kiểm tra đơn hàng đã thanh toán chưa
    if (order.isPaid) {
      res.status(400);
      throw new Error('Đơn hàng đã được thanh toán');
    }

    // Kiểm tra số tiền
    if (order.totalPrice <= 0) {
      res.status(400);
      throw new Error('Số tiền thanh toán không hợp lệ');
    }

    // Cập nhật phương thức thanh toán thành COD
    order.paymentMethod = 'cod';
    order.status = 'processing'; // Chuyển sang trạng thái đang xử lý
    
    // Khởi tạo paymentResult cho COD
    order.paymentResult = {
      id: `COD_${Date.now()}`,
      status: 'pending',
      update_time: new Date().toISOString(),
      email_address: '',
      reference: `COD_${order._id}`
    };
    
    await order.save();

    console.log('COD payment created successfully for order:', orderId);

    res.status(200).json({
      success: true,
      message: 'Đã xác nhận thanh toán COD thành công',
      data: {
        orderId: order._id,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalPrice,
        status: order.status,
        paymentReference: order.paymentResult?.reference
      }
    });
  } catch (error) {
    console.error('Error creating COD payment:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi tạo thanh toán COD: ${(error as Error).message}`
    });
  }
});

/**
 * @desc    Xác nhận thanh toán COD (dành cho admin)
 * @route   POST /api/payments/confirm-cod
 * @access  Private/Admin
 */
export const confirmCODPayment = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400);
      throw new Error('Mã đơn hàng không được bỏ trống');
    }

    console.log('Admin đang xác nhận thanh toán COD cho đơn hàng:', orderId);

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng');
    }

    // Kiểm tra đơn hàng có phải COD không
    if (order.paymentMethod !== 'cod') {
      res.status(400);
      throw new Error('Đơn hàng này không phải là thanh toán COD');
    }

    // Kiểm tra đơn hàng đã thanh toán chưa
    if (order.isPaid) {
      res.status(400);
      throw new Error('Đơn hàng đã được xác nhận thanh toán');
    }

    // Xác nhận thanh toán COD
    order.isPaid = true;
    order.paidAt = new Date();
    order.status = 'delivered'; // Chuyển sang trạng thái đã giao hàng
    
    // Cập nhật paymentResult
    if (order.paymentResult) {
      order.paymentResult.status = 'success';
      order.paymentResult.update_time = new Date().toISOString();
    }
    
    await order.save();

    console.log('COD payment confirmed successfully for order:', orderId);

    res.status(200).json({
      success: true,
      message: 'Đã xác nhận thanh toán COD thành công',
      data: {
        orderId: order._id,
        isPaid: order.isPaid,
        paidAt: order.paidAt,
        totalAmount: order.totalPrice,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Error confirming COD payment:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi xác nhận thanh toán COD: ${(error as Error).message}`
    });
  }
}); 