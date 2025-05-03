import { Link } from "wouter";
import { Facebook, Mail, Phone, MessageSquareLock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="flex items-center mb-4">
              <span className="text-white text-xl font-medium">
                Homi<span className="text-secondary">Tutor</span>
              </span>
            </Link>
            <p className="text-gray-400 mb-4">
              Nền tảng kết nối gia sư và học viên hàng đầu Việt Nam
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="MessageSquareLock"
              >
                <MessageSquareLock className="h-5 w-5" />
              </a>
              <a
                href="mailto:info@homitutor.vn"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
              <a
                href="tel:+84123456789"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Phone"
              >
                <Phone className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-lg mb-4">Dành cho học viên</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/tutors" className="text-gray-400 hover:text-white transition-colors">
                  Tìm gia sư
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">
                  Cách thức hoạt động
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="text-gray-400 hover:text-white transition-colors">
                  Đặt lịch học
                </Link>
              </li>
              <li>
                <Link href="/payment" className="text-gray-400 hover:text-white transition-colors">
                  Thanh toán
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="text-gray-400 hover:text-white transition-colors">
                  Đánh giá gia sư
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-lg mb-4">Dành cho gia sư</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/become-tutor" className="text-gray-400 hover:text-white transition-colors">
                  Đăng ký làm gia sư
                </Link>
              </li>
              <li>
                <Link href="/tutor-profile" className="text-gray-400 hover:text-white transition-colors">
                  Quản lý hồ sơ
                </Link>
              </li>
              <li>
                <Link href="/create-ad" className="text-gray-400 hover:text-white transition-colors">
                  Tạo quảng cáo
                </Link>
              </li>
              <li>
                <Link href="/tutor-payment" className="text-gray-400 hover:text-white transition-colors">
                  Nhận thanh toán
                </Link>
              </li>
              <li>
                <Link href="/teaching-tools" className="text-gray-400 hover:text-white transition-colors">
                  Công cụ dạy học
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-lg mb-4">Hỗ trợ</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/help-center" className="text-gray-400 hover:text-white transition-colors">
                  Trung tâm trợ giúp
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
                  Câu hỏi thường gặp
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <p className="text-gray-400">
            © {new Date().getFullYear()} HomiTutor. Bản quyền thuộc về công ty TNHH HomiTutor.
          </p>
          <div className="mt-4 md:mt-0">
            <select className="bg-gray-800 text-gray-400 py-1 px-2 rounded border border-gray-700 focus:outline-none">
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
}
