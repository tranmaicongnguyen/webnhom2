import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiShoppingCart, FiUser, FiSearch, FiMenu, FiX, FiLogIn } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../../app/hooks';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  
  // Lấy số lượng sản phẩm trong giỏ hàng từ Redux store
  const { items } = useAppSelector((state) => state.cart);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const cartItemCount = items.length;

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Chuyển hướng đến trang tìm kiếm với query parameter
    window.location.href = `/products?keyword=${encodeURIComponent(searchQuery)}`;
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  // Kiểm tra xem đường dẫn hiện tại có phải là trang chủ không
  const isHomePage = location.pathname === '/';

  return (
    <header className={`fixed w-full top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white shadow-md py-2' 
        : isHomePage 
          ? 'bg-transparent py-4' 
          : 'bg-gray-900 py-4'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <motion.img 
              src="/logo.png" 
              alt="StoreClothes" 
              className="h-10 w-auto" 
              whileHover={{ scale: 1.05 }}
            />
            <span className={`ml-2 font-bold text-xl ${isScrolled ? 'text-primary' : 'text-white'}`}>
              StoreClothes
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavLink to="/" label="Trang chủ" isScrolled={isScrolled} />
            <NavLink to="/products" label="Sản phẩm" isScrolled={isScrolled} />
            <NavLink to="/about" label="Giới thiệu" isScrolled={isScrolled} />
            <NavLink to="/contact" label="Liên hệ" isScrolled={isScrolled} />
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className={`p-2 rounded-full transition-colors ${
                isScrolled ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white'
              }`}
              aria-label="Search"
            >
              {React.createElement(FiSearch, { size: 20 })}
            </button>
            
            <Link 
              to="/cart" 
              className={`p-2 rounded-full transition-colors relative ${
                isScrolled ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white'
              }`}
              aria-label="Cart"
            >
              {React.createElement(FiShoppingCart, { size: 20 })}
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>
            
            {isAuthenticated ? (
              <Link 
                to="/profile" 
                className={`p-2 rounded-full transition-colors ${
                  isScrolled ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white'
                }`}
                aria-label="Profile"
              >
                {React.createElement(FiUser, { size: 20 })}
              </Link>
            ) : (
              <Link 
                to="/login" 
                className={`p-2 rounded-full transition-colors ${
                  isScrolled ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white'
                }`}
                aria-label="Login"
              >
                {React.createElement(FiLogIn, { size: 20 })}
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-full focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? 
              React.createElement(FiX, { size: 24, className: isScrolled ? 'text-gray-800' : 'text-white' }) : 
              React.createElement(FiMenu, { size: 24, className: isScrolled ? 'text-gray-800' : 'text-white' })
            }
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white shadow-lg"
          >
            <div className="container mx-auto px-4 py-4">
              <nav className="flex flex-col space-y-4">
                <MobileNavLink to="/" label="Trang chủ" />
                <MobileNavLink to="/products" label="Sản phẩm" />
                <MobileNavLink to="/about" label="Giới thiệu" />
                <MobileNavLink to="/contact" label="Liên hệ" />
                <MobileNavLink to="/cart" label="Giỏ hàng" />
                {isAuthenticated ? (
                  <MobileNavLink to="/profile" label="Tài khoản" />
                ) : (
                  <MobileNavLink to="/login" label="Đăng nhập" />
                )}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 px-4 z-50"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSearchSubmit} className="flex items-center">
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full py-4 px-6 text-lg focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-primary text-white p-4 hover:bg-primary-dark transition-colors"
                  aria-label="Search"
                >
                  {React.createElement(FiSearch, { size: 20 })}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

interface NavLinkProps {
  to: string;
  label: string;
  isScrolled: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ to, label, isScrolled }) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      className={`relative font-medium transition-colors ${
        isScrolled
          ? `text-gray-800 hover:text-primary ${isActive ? 'text-primary' : ''}`
          : `text-white hover:text-white/80 ${isActive ? 'text-white' : 'text-white/90'}`
      }`}
    >
      {label}
      {isActive && (
        <motion.div
          layoutId="navIndicator"
          className={`absolute -bottom-1 left-0 right-0 h-0.5 ${isScrolled ? 'bg-primary' : 'bg-white'}`}
          transition={{ type: 'spring', duration: 0.5 }}
        />
      )}
    </Link>
  );
};

interface MobileNavLinkProps {
  to: string;
  label: string;
}

const MobileNavLink: React.FC<MobileNavLinkProps> = ({ to, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      className={`py-2 px-4 rounded-md font-medium ${
        isActive ? 'bg-primary/10 text-primary' : 'text-gray-800 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  );
};

export default Header; 