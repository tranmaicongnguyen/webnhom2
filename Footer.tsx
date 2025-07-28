import React from 'react';
import { Link } from 'react-router-dom';
import { FiFacebook, FiInstagram, FiTwitter, FiYoutube, FiMapPin, FiPhone, FiMail } from 'react-icons/fi';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About section */}
          <div>
            <h3 className="text-xl font-bold mb-4">Về StoreClothes</h3>
            <p className="text-gray-400 mb-4">
              StoreClothes cung cấp các sản phẩm quần áo chất lượng cao với nhiều phong cách đa dạng cho nam, nữ và trẻ em.
            </p>
            <div className="flex space-x-4">
              <SocialLink href="https://facebook.com" icon={React.createElement(FiFacebook, { size: 20 })} label="Facebook" />
              <SocialLink href="https://instagram.com" icon={React.createElement(FiInstagram, { size: 20 })} label="Instagram" />
              <SocialLink href="https://twitter.com" icon={React.createElement(FiTwitter, { size: 20 })} label="Twitter" />
              <SocialLink href="https://youtube.com" icon={React.createElement(FiYoutube, { size: 20 })} label="YouTube" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold mb-4">Liên kết nhanh</h3>
            <ul className="space-y-2">
              <li>
                <FooterLink to="/products" label="Sản phẩm" />
              </li>
              <li>
                <FooterLink to="/products?category=nam" label="Áo Nam" />
              </li>
              <li>
                <FooterLink to="/products?category=nu" label="Áo Nữ" />
              </li>
              <li>
                <FooterLink to="/products?category=tre-em" label="Áo Trẻ Em" />
              </li>
              <li>
                <FooterLink to="/products?discount=true" label="Khuyến Mãi" />
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-xl font-bold mb-4">Hỗ trợ khách hàng</h3>
            <ul className="space-y-2">
              <li>
                <FooterLink to="/faq" label="Câu hỏi thường gặp" />
              </li>
              <li>
                <FooterLink to="/shipping" label="Chính sách vận chuyển" />
              </li>
              <li>
                <FooterLink to="/returns" label="Chính sách đổi trả" />
              </li>
              <li>
                <FooterLink to="/size-guide" label="Hướng dẫn chọn size" />
              </li>
              <li>
                <FooterLink to="/contact" label="Liên hệ" />
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-xl font-bold mb-4">Thông tin liên hệ</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                {React.createElement(FiMapPin, { className: "mt-1 mr-3 text-primary" })}
                <span className="text-gray-400">123 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center">
                {React.createElement(FiPhone, { className: "mr-3 text-primary" })}
                <span className="text-gray-400">+84 123 456 789</span>
              </li>
              <li className="flex items-center">
                {React.createElement(FiMail, { className: "mr-3 text-primary" })}
                <span className="text-gray-400">info@webgiay.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h4 className="text-sm font-medium mb-2">Phương thức thanh toán</h4>
              <div className="flex space-x-4">
                <img src="/payments/visa.svg" alt="Visa" className="h-8" />
                <img src="/payments/mastercard.svg" alt="MasterCard" className="h-8" />
                <img src="/payments/momo.svg" alt="MoMo" className="h-8" />
                <img src="/payments/zalopay.svg" alt="ZaloPay" className="h-8" />
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Đơn vị vận chuyển</h4>
              <div className="flex space-x-4">
                <img src="/shipping/ghn.svg" alt="GHN" className="h-8" />
                <img src="/shipping/ghtk.svg" alt="GHTK" className="h-8" />
                <img src="/shipping/vnpost.svg" alt="VN Post" className="h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
          <p>© {currentYear} StoreClothes. Tất cả các quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
};

interface SocialLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

const SocialLink: React.FC<SocialLinkProps> = ({ href, icon, label }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-gray-800 hover:bg-primary transition-colors w-10 h-10 rounded-full flex items-center justify-center"
      aria-label={label}
    >
      {icon}
    </a>
  );
};

interface FooterLinkProps {
  to: string;
  label: string;
}

const FooterLink: React.FC<FooterLinkProps> = ({ to, label }) => {
  return (
    <Link to={to} className="text-gray-400 hover:text-primary transition-colors">
      {label}
    </Link>
  );
};

export default Footer; 