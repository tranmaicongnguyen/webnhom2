import axios from 'axios';
import crypto from 'crypto';
import sepayConfig from '../config/sepay.config';

interface SepayCreatePaymentOptions {
  orderId: string;
  amount: number;
  description: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

interface SepayQRCodeOptions {
  orderId: string;
  amount: number;
  description?: string;
  webhookUrl?: string;
}

/**
 * Tạo thanh toán Sepay
 */
export const createSepayPayment = async (options: SepayCreatePaymentOptions) => {
  try {
    const {
      orderId,
      amount,
      description,
      customerName = '',
      customerEmail = '',
      customerPhone = '',
      returnUrl = 'http://localhost:3000/payment/success',
      cancelUrl = 'http://localhost:3000/payment/error'
    } = options;

    // Tạo mã đơn hàng theo định dạng Sepay
    const txnRef = `${sepayConfig.PREFIX}${Date.now()}_${orderId}`;

    // Tạo chữ ký
    const dataToSign = `${txnRef}|${amount}|${sepayConfig.API_KEY}`;
    const signature = crypto
      .createHmac('sha256', sepayConfig.SECRET_KEY)
      .update(dataToSign)
      .digest('hex');

    // Dữ liệu thanh toán
    const paymentData = {
      merchant_key: sepayConfig.API_KEY,
      order_code: txnRef,
      amount: amount,
      description: description,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      signature: signature,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      // Thông tin ngân hàng
      bank_code: sepayConfig.BANK_CODE,
      account_number: sepayConfig.ACCOUNT_NUMBER,
      account_name: sepayConfig.ACCOUNT_NAME,
      // Webhook URL cho cập nhật trạng thái
      webhook_url: sepayConfig.WEBHOOK_URL
    };

    console.log('Sepay payment data:', paymentData);

    // Gọi API tạo thanh toán Sepay
    const response = await axios.post(
      `${sepayConfig.API_URL}/v1/payment/create`,
      paymentData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sepayConfig.API_KEY}`
        }
      }
    );

    return {
      success: true,
      data: response.data,
      txnRef: txnRef,
    };
  } catch (error: any) {
    console.error('Sepay payment creation error:', error?.response?.data || error.message);
    throw new Error(`Lỗi tạo thanh toán Sepay: ${error?.response?.data?.message || error.message}`);
  }
};

/**
 * Tạo QR code thanh toán Sepay
 */
export const createSepayQRCode = async (options: SepayQRCodeOptions) => {
  try {
    const { orderId, amount, description, webhookUrl = sepayConfig.WEBHOOK_URL } = options;
    
    // Tạo reference code - mã này sẽ là nội dung chuyển khoản
    const reference = `${sepayConfig.PREFIX}${Date.now()}_${orderId}`;
    
    // Tạo timestamp để đảm bảo mỗi request là duy nhất
    const timestamp = Date.now();
    
    // Dữ liệu để tạo QR code
    const requestData = {
      amount: amount,
      reference: reference,
      description: description || `Thanh toán đơn hàng #${orderId}`,
      timestamp: timestamp,
      account_number: sepayConfig.ACCOUNT_NUMBER,
      account_name: sepayConfig.ACCOUNT_NAME,
      bank_code: sepayConfig.BANK_CODE,
      webhook_url: webhookUrl,
      expiry_time: Math.floor(Date.now() / 1000) + 3600 // Hết hạn sau 1 giờ
    };
    
    // Tạo chữ ký
    const dataToSign = `${requestData.reference}|${requestData.amount}|${requestData.timestamp}|${sepayConfig.API_KEY}`;
    const signature = crypto
      .createHmac('sha256', sepayConfig.SECRET_KEY)
      .update(dataToSign)
      .digest('hex');
    
    console.log('Creating Sepay QR with data:', {
      ...requestData,
      api_key: `${sepayConfig.API_KEY.substring(0, 5)}...`,
      signature: `${signature.substring(0, 10)}...`
    });
    
    // Tạo nội dung QR code cho chuyển khoản ngân hàng trực tiếp
    // Format chuẩn VietQR cho các ngân hàng Việt Nam
    const bankInfo = sepayConfig.BANK_CODE;
    const accountNumber = sepayConfig.ACCOUNT_NUMBER;
    const amount_str = amount.toString();
    const content = reference;
    
    // Tạo URL để sinh mã QR VietQR - LUÔN THÀNH CÔNG
    const vietQrUrl = `https://img.vietqr.io/image/${bankInfo}-${accountNumber}-compact.png?amount=${amount_str}&addInfo=${content}&accountName=${encodeURIComponent(sepayConfig.ACCOUNT_NAME)}`;
    
    console.log('VietQR URL created:', vietQrUrl);
    
    // Trả về kết quả với VietQR
    return {
      success: true,
      data: {
        qr_code: content,
        qr_image: vietQrUrl,
        bank_info: {
          bank_code: sepayConfig.BANK_CODE,
          account_number: sepayConfig.ACCOUNT_NUMBER,
          account_name: sepayConfig.ACCOUNT_NAME
        }
      },
      reference: reference,
      orderId: orderId,
      amount: amount
    };
  } catch (error: any) {
    console.error('Sepay QR code creation error:', error?.response?.data || error.message);
    throw new Error(`Lỗi tạo mã QR Sepay: ${error?.response?.data?.message || error.message}`);
  }
};

/**
 * Kiểm tra trạng thái thanh toán QR code Sepay
 */
export const checkSepayQRStatus = async (reference: string) => {
  try {
    console.log('Kiểm tra trạng thái thanh toán QR với reference:', reference);
    
    // Tạo chữ ký
    const timestamp = Date.now();
    const dataToSign = `${reference}|${timestamp}|${sepayConfig.API_KEY}`;
    const signature = crypto
      .createHmac('sha256', sepayConfig.SECRET_KEY)
      .update(dataToSign)
      .digest('hex');
    
    try {
      // Thử gọi API kiểm tra trạng thái
    const response = await axios.get(
      `${sepayConfig.API_URL}/v1/qr/status/${reference}`,
      {
        headers: {
          'X-Api-Key': sepayConfig.API_KEY,
          'X-Timestamp': `${timestamp}`,
          'X-Signature': signature
          },
          timeout: 10000 // timeout 10s
      }
    );
      
      console.log('Sepay QR status response:', response.data);
    
    // Trả về kết quả với trạng thái đã thanh toán hay chưa
    return {
      success: true,
      data: response.data,
      isPaid: response.data.status === 'completed',
      status: response.data.status,
      amount: response.data.amount,
      transactionId: response.data.transaction_id || null,
      paymentTime: response.data.payment_time || null
    };
    } catch (apiError) {
      console.error('Sepay API error when checking QR status:', apiError);
      
      // Kiểm tra nếu reference có format của đơn hàng đã thanh toán
      // Theo định dạng PREFIX_TIMESTAMP_ORDERID
      const parts = reference.split('_');
      if (parts.length >= 3) {
        const orderId = parts[parts.length - 1];
        
        try {
          // Thử tìm đơn hàng và kiểm tra trạng thái thanh toán
          const mongoose = await import('mongoose');
          const Order = mongoose.model('Order');
          const order = await Order.findById(orderId);
          
          if (order && order.isPaid) {
            console.log('Đơn hàng đã được thanh toán:', orderId);
            return {
              success: true,
              data: {
                status: 'completed',
                amount: order.totalPrice,
                transaction_id: order.paymentResult?.id || reference,
                payment_time: order.paidAt?.toISOString() || new Date().toISOString()
              },
              isPaid: true,
              status: 'completed',
              amount: order.totalPrice,
              transactionId: order.paymentResult?.id || reference,
              paymentTime: order.paidAt?.toISOString() || new Date().toISOString()
            };
          }
        } catch (dbError) {
          console.error('Lỗi khi kiểm tra đơn hàng trong database:', dbError);
        }
      }
      
      // Trả về trạng thái chưa thanh toán nếu không thể kết nối API
      return {
        success: false,
        data: {
          status: 'pending',
          amount: 0,
          transaction_id: null,
          payment_time: null
        },
        isPaid: false,
        status: 'pending',
        amount: 0,
        transactionId: null,
        paymentTime: null
      };
    }
  } catch (error: any) {
    console.error('Sepay QR status check error:', error?.response?.data || error.message);
    throw new Error(`Lỗi kiểm tra trạng thái mã QR Sepay: ${error?.response?.data?.message || error.message}`);
  }
};

/**
 * Xác thực webhook từ Sepay
 */
export const verifySepayWebhook = (payload: any, signature: string): boolean => {
  try {
    if (!payload || !signature) {
      console.error('Missing payload or signature');
      return false;
    }

    // Xử lý dữ liệu webhook
    const dataToSign = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);
    
    // Tính toán chữ ký
    const calculatedSignature = crypto
      .createHmac('sha256', sepayConfig.WEBHOOK_SECRET)
      .update(dataToSign)
      .digest('hex');

    const isValid = calculatedSignature === signature;

    if (!isValid) {
      console.error('Sepay webhook signature verification failed');
      console.error('Received:', signature);
      console.error('Calculated:', calculatedSignature);
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying Sepay webhook:', error);
    return false;
  }
};

/**
 * Kiểm tra trạng thái thanh toán Sepay
 */
export const checkSepayPaymentStatus = async (transactionId: string) => {
  try {
    const response = await axios.get(
      `${sepayConfig.API_URL}/v1/payment/status/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${sepayConfig.API_KEY}`
        }
      }
    );

    // Kiểm tra và trả về trạng thái chi tiết hơn
    return {
      success: true,
      data: response.data,
      isPaid: response.data.status === 'completed' || response.data.status === 'success',
      status: response.data.status,
      amount: response.data.amount,
      transactionId: response.data.transaction_id || transactionId,
      paymentTime: response.data.payment_time || null
    };
  } catch (error: any) {
    console.error('Sepay payment status check error:', error?.response?.data || error.message);
    throw new Error(`Lỗi kiểm tra trạng thái thanh toán Sepay: ${error?.response?.data?.message || error.message}`);
  }
}; 