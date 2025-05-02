import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="banner-gradient text-white py-12 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light mb-4 leading-tight">
              Tìm gia sư <span className="font-medium">hoàn hảo</span> cho mọi nhu cầu học tập
            </h1>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              HomiTutor kết nối bạn với đội ngũ gia sư chất lượng cao, được kiểm duyệt kỹ lưỡng, giúp bạn đạt kết quả học tập tốt nhất.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/tutors">
                <Button className="bg-white text-primary hover:bg-gray-100 transition duration-200 shadow-md px-6 py-3 h-auto">
                  Tìm gia sư ngay
                </Button>
              </Link>
              <Link href="/become-tutor">
                <Button className="bg-secondary hover:bg-secondary-dark transition duration-200 shadow-md px-6 py-3 h-auto">
                  Đăng ký làm gia sư
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 md:pl-8">
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 transform md:rotate-2">
              <img 
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80" 
                alt="Học sinh đang học với gia sư" 
                className="w-full h-auto rounded"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
