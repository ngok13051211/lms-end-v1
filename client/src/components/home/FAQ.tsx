import { useState } from "react";
import { Link } from "wouter";
import FAQItem from "@/components/ui/FAQItem";

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const faqItems = [
    {
      question: "Làm thế nào để tìm gia sư phù hợp trên HomiTutor?",
      answer: "Để tìm gia sư phù hợp, bạn có thể sử dụng công cụ tìm kiếm của chúng tôi với các bộ lọc như môn học, cấp học, hình thức dạy học, mức giá. Sau đó, bạn có thể xem đánh giá, hồ sơ chi tiết và liên hệ trực tiếp với gia sư để trao đổi thêm trước khi quyết định."
    },
    {
      question: "Chi phí sử dụng dịch vụ HomiTutor như thế nào?",
      answer: "HomiTutor miễn phí đăng ký và tìm kiếm gia sư. Bạn chỉ trả tiền cho gia sư theo mức giá họ đã niêm yết trên trang cá nhân. HomiTutor sẽ thu một khoản phí nhỏ từ gia sư cho mỗi buổi học được đặt thông qua nền tảng, không có phí ẩn đối với học viên."
    },
    {
      question: "Làm thế nào để đăng ký làm gia sư trên HomiTutor?",
      answer: "Để trở thành gia sư, bạn cần đăng ký tài khoản HomiTutor, chọn vai trò \"Gia sư\", điền thông tin cá nhân và trình độ chuyên môn. Bạn sẽ cần tải lên các giấy tờ xác minh như bằng cấp, chứng chỉ. Sau khi đội ngũ HomiTutor xét duyệt (thường trong vòng 48 giờ), bạn có thể tạo hồ sơ và bắt đầu quảng cáo dịch vụ của mình."
    },
    {
      question: "HomiTutor có đảm bảo chất lượng gia sư không?",
      answer: "Có, HomiTutor có quy trình kiểm duyệt nghiêm ngặt đối với gia sư. Chúng tôi xác minh danh tính, bằng cấp và chứng chỉ của tất cả gia sư. Ngoài ra, hệ thống đánh giá và phản hồi từ học viên giúp đảm bảo chất lượng dịch vụ. Nếu bạn không hài lòng, chúng tôi có chính sách hoàn tiền cho buổi học đầu tiên."
    },
    {
      question: "Làm thế nào để liên hệ với bộ phận hỗ trợ của HomiTutor?",
      answer: "Bạn có thể liên hệ với bộ phận hỗ trợ khách hàng của chúng tôi thông qua email support@homitutor.vn, số điện thoại 1900 xxxx, hoặc sử dụng tính năng trò chuyện trực tiếp có sẵn ở góc dưới bên phải của trang web và ứng dụng di động. Đội ngũ hỗ trợ làm việc từ 8:00 đến 22:00 hàng ngày."
    }
  ];

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-light mb-2">
            Câu hỏi <span className="font-medium text-primary">thường gặp</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Những điều bạn cần biết về HomiTutor
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <FAQItem
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={activeIndex === index}
              onClick={() => toggleAccordion(index)}
            />
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/faq">
            <a className="text-primary font-medium hover:text-primary-dark">
              Xem thêm câu hỏi thường gặp
            </a>
          </Link>
        </div>
      </div>
    </section>
  );
}
