import { 
  Search, 
  MessageSquare, 
  GraduationCap 
} from "lucide-react";

export default function HowItWorks() {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light mb-2">
            Cách thức <span className="font-medium text-primary">hoạt động</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            HomiTutor giúp bạn tìm kiếm và kết nối với gia sư phù hợp chỉ trong vài bước đơn giản
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-primary-light bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-primary text-3xl" />
            </div>
            <h3 className="text-xl font-medium mb-2">Tìm kiếm gia sư</h3>
            <p className="text-muted-foreground">
              Dễ dàng tìm kiếm gia sư phù hợp với môn học, cấp học và ngân sách của bạn.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary-light bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="text-primary text-3xl" />
            </div>
            <h3 className="text-xl font-medium mb-2">Kết nối trực tiếp</h3>
            <p className="text-muted-foreground">
              Liên hệ trực tiếp với gia sư để thảo luận về lịch học và nhu cầu cụ thể.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary-light bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="text-primary text-3xl" />
            </div>
            <h3 className="text-xl font-medium mb-2">Bắt đầu học tập</h3>
            <p className="text-muted-foreground">
              Tham gia các buổi học chất lượng cao với gia sư được chứng nhận.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
