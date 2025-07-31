import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Lấy thông tin user từ Redux store
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Kiểm tra token trong localStorage để xác định trạng thái đăng nhập
    const checkAuth = async () => {
      setLoading(true);
      // Có thể thêm logic gọi API để validate token nếu cần
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Kiểm tra xem người dùng có phải là admin không
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Chuyển hướng nếu chưa đăng nhập
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Chuyển hướng nếu không có quyền admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <motion.main 
          className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="container mx-auto px-4 py-6">
            <Outlet />
          </div>
        </motion.main>
      </div>
    </div>
  );
};

export default AdminLayout; 