import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function BecomeTutor() {
  return (
    <section className="py-12 md:py-16 bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h2 className="text-3xl font-light mb-4">
              Trở thành <span className="font-medium">gia sư</span> trên HomiTutor
            </h2>
            <p className="text-white text-opacity-90 mb-6">
              Chia sẻ kiến thức của bạn, xây dựng hồ sơ chuyên nghiệp và kiếm thêm thu nhập với lịch trình linh hoạt. HomiTutor giúp bạn kết nối với học sinh và phát triển sự nghiệp giảng dạy.
            </p>
            <ul className="mb-8 space-y-3">
              <li className="flex items-start">
                <CheckCircle className="mr-2 text-secondary shrink-0" />
                <span>Toàn quyền kiểm soát giá cả và lịch dạy</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="mr-2 text-secondary shrink-0" />
                <span>Hỗ trợ thanh toán an toàn và đảm bảo</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="mr-2 text-secondary shrink-0" />
                <span>Công cụ dạy học trực tuyến chuyên nghiệp</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="mr-2 text-secondary shrink-0" />
                <span>Đa dạng học sinh từ nhiều cấp độ khác nhau</span>
              </li>
            </ul>
            <Link href="/become-tutor">
              <Button className="bg-white text-primary hover:bg-gray-100 transition duration-200 px-6 py-3 h-auto">
                Đăng ký làm gia sư
              </Button>
            </Link>
          </div>
          <div className="md:w-1/2 md:pl-8">
            <img 
              src="https://images.unsplash.com/photo-1577896851231-70ef18881754?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80" 
              alt="Trở thành gia sư" 
              className="w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
