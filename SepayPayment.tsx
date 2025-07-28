import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

interface SepayPaymentProps {
  orderId: string;
}

const SepayPayment: React.FC<SepayPaymentProps> = ({ orderId }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSepayPayment = async () => {
    if (!orderId) {
      toast.error('Không tìm thấy mã đơn hàng');
      return;
    }

    setLoading(true);
    try {
      // Chuyển hướng đến trang thanh toán Sepay với method=sepay
      navigate(`/payment/${orderId}?method=sepay`);
    } catch (error: any) {
      setLoading(false);
      console.error('Sepay payment error:', error);
      const message = error.response?.data?.message || 'Không thể tạo giao dịch thanh toán';
      toast.error(message);
    }
  };

  return (
    <button
      onClick={handleSepayPayment}
      disabled={loading}
      className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 flex items-center justify-center"
    >
      {loading ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Đang xử lý...
        </span>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <span>Thanh toán qua Sepay</span>
        </>
      )}
    </button>
  );
};

export default SepayPayment; 