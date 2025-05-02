import { Phone, TabletSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppDownload() {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8 md:p-12">
          <div className="md:flex md:items-center md:justify-between">
            <div className="md:w-2/3 mb-8 md:mb-0">
              <h2 className="text-3xl font-light mb-4">
                Tải ứng dụng <span className="font-medium text-primary">HomiTutor</span>
              </h2>
              <p className="text-muted-foreground mb-6">
                Trải nghiệm học tập mọi lúc, mọi nơi với ứng dụng HomiTutor. Dễ dàng tìm kiếm gia sư, đặt lịch học và tham gia lớp học trực tuyến ngay trên điện thoại.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button variant="default" className="flex items-center justify-center bg-black text-white hover:bg-gray-800">
                  <Phone className="mr-2 h-5 w-5" />
                  <span>App Store</span>
                </Button>
                <Button variant="default" className="flex items-center justify-center bg-black text-white hover:bg-gray-800">
                  <TabletSmartphone className="mr-2 h-5 w-5" />
                  <span>Google Play</span>
                </Button>
              </div>
            </div>
            <div className="md:w-1/3 flex justify-center">
              <img 
                src="https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1474&q=80" 
                alt="HomiTutor Mobile App" 
                className="max-w-full h-auto max-h-60 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
