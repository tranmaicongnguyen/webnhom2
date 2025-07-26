import dotenv from 'dotenv';

dotenv.config();

const sepayConfig = {
  API_URL: process.env.SEPAY_API_URL || 'https://api.sepay.vn',
  API_KEY: process.env.SEPAY_API_KEY || 'NEP0VPMQNMBMGQCQ9KAO1HEREAXKDKVLT3SI82TI4NHDSLS4PJFLFYWD8BPAH763',
  SECRET_KEY: process.env.SEPAY_SECRET_KEY || 'NEP0VPMQNMBMGQCQ9KAO1HEREAXKDKVLT3SI82TI4NHDSLS4PJFLFYWD8BPAH763',
  WEBHOOK_SECRET: process.env.SEPAY_WEBHOOK_SECRET || 'sepay_webhook_secret',
  PREFIX: process.env.SEPAY_PREFIX || 'SEVQR',
  ACCOUNT_NUMBER: process.env.SEPAY_ACCOUNT_NUMBER || '103870429701',
  BANK_CODE: process.env.SEPAY_BANK_CODE || 'VietinBank',
  BANK_NAME: process.env.SEPAY_BANK_NAME || 'Ngân hàng TMCP Công Thương Việt Nam',
  ACCOUNT_NAME: process.env.SEPAY_ACCOUNT_NAME || 'CÔNG TY TNHH DU LỊCH GOTOUR',
  WEBHOOK_URL: process.env.SEPAY_WEBHOOK_URL || `${process.env.API_URL || 'http://localhost:5000'}/api/payments/sepay-webhook`,
  QR_CHECK_INTERVAL: parseInt(process.env.SEPAY_QR_CHECK_INTERVAL || '10000', 10), // 10 giây
  QR_MAX_TIMEOUT: parseInt(process.env.SEPAY_QR_MAX_TIMEOUT || '900000', 10), // 15 phút
  QR_AUTO_REFRESH: process.env.SEPAY_QR_AUTO_REFRESH === 'true' || true,
};

export default sepayConfig; 