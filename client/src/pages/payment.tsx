import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import {
  CalendarIcon,
  Clock,
  CreditCard,
  MapPin,
  MonitorSmartphone,
  Loader2,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  BanknoteIcon,
  CreditCardIcon,
  ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import MainLayout from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Định nghĩa kiểu dữ liệu
interface BookingData {
  tutorId: string;
  courseId: string;
  mode: "online" | "offline";
  location?: string;
  note?: string;
  bookings: BookingInfo[];
}

interface BookingInfo {
  scheduleId: number;
  date: string; // Format YYYY-MM-DD
  startTime: string; // Format HH:mm
  endTime: string; // Format HH:mm
}

interface Course {
  id: string;
  title: string;
  subject:
    | {
        id: number;
        name: string;
      }
    | string;
  educationLevel:
    | {
        id: number;
        name: string;
      }
    | string;
  description: string;
  duration: string;
  pricePerSession: number;
  deliveryModes: "online" | "offline" | "both";
  tags: string[];
}

interface Tutor {
  id: string;
  user_id: number;
  bio: string;
  date_of_birth?: string;
  address?: string;
  certifications?: string;
  availability?: string;
  is_verified: boolean;
  is_featured?: boolean;
  rejection_reason?: string;
  rating: number;
  total_reviews: number;
  experience_years?: number;
  education?: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
    phone?: string;
  };
  subjects: (Subject | string)[];
}

interface Subject {
  id: number;
  name: string;
  description?: string;
  icon?: string;
}

const paymentSchema = z.object({
  paymentMethod: z.enum(["online", "offline"], {
    required_error: "Vui lòng chọn phương thức thanh toán",
  }),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function PaymentPage() {
  const [, params] = useRoute("/payment");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Get user information from Redux store
  const user = useSelector((state: any) => state.auth.user);
  // State để lưu dữ liệu từ localStorage
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Tính toán giờ học và tổng tiền
  const [totalHours, setTotalHours] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);

  // Khởi tạo form
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: undefined,
    },
  });
  // Load dữ liệu từ localStorage khi component mount
  useEffect(() => {
    try {
      const savedBookingData = localStorage.getItem("bookingData");
      const savedCourse = localStorage.getItem("selectedCourse");
      const savedTutor = localStorage.getItem("selectedTutor");

      if (!savedBookingData || !savedCourse || !savedTutor) {
        toast({
          title: "Lỗi",
          description: "Không có thông tin đặt lịch. Vui lòng đặt lịch lại.",
          variant: "destructive",
        });
        // Redirect về trang chủ sau 2 giây
        setTimeout(() => {
          navigate("/");
        }, 2000);
        return;
      }

      // Parse và kiểm tra dữ liệu
      const parsedBookingData = JSON.parse(savedBookingData) as BookingData;
      const parsedCourse = JSON.parse(savedCourse) as Course;
      const parsedTutor = JSON.parse(savedTutor) as Tutor;

      // Kiểm tra dữ liệu có đúng định dạng không
      if (
        !parsedBookingData.tutorId ||
        !parsedBookingData.courseId ||
        !parsedBookingData.mode ||
        !Array.isArray(parsedBookingData.bookings) ||
        parsedBookingData.bookings.length === 0
      ) {
        throw new Error("Dữ liệu đặt lịch không hợp lệ");
      }

      if (
        !parsedCourse.id ||
        !parsedCourse.title ||
        !parsedCourse.pricePerSession
      ) {
        throw new Error("Dữ liệu khóa học không hợp lệ");
      }

      if (!parsedTutor.id) {
        throw new Error("Dữ liệu gia sư không hợp lệ");
      }

      setBookingData(parsedBookingData);
      setCourse(parsedCourse);
      setTutor(parsedTutor);

      // Tính tổng giờ học và tổng tiền
      if (parsedBookingData && parsedCourse) {
        let hours = 0;
        let validBookings = true;

        parsedBookingData.bookings.forEach((booking) => {
          if (!booking.date || !booking.startTime || !booking.endTime) {
            validBookings = false;
            return;
          }

          const startParts = booking.startTime.split(":");
          const endParts = booking.endTime.split(":");

          if (startParts.length !== 2 || endParts.length !== 2) {
            validBookings = false;
            return;
          }

          const startHour = parseInt(startParts[0]);
          const startMinute = parseInt(startParts[1]);
          const endHour = parseInt(endParts[0]);
          const endMinute = parseInt(endParts[1]);

          if (
            isNaN(startHour) ||
            isNaN(startMinute) ||
            isNaN(endHour) ||
            isNaN(endMinute)
          ) {
            validBookings = false;
            return;
          }

          const duration = endHour - startHour + (endMinute - startMinute) / 60;

          if (duration <= 0) {
            validBookings = false;
            return;
          }

          hours += duration;
        });

        if (!validBookings) {
          throw new Error("Thông tin buổi học không hợp lệ");
        }

        setTotalHours(parseFloat(hours.toFixed(2))); // Làm tròn 2 chữ số thập phân
        setTotalAmount(
          parseFloat((hours * parsedCourse.pricePerSession).toFixed(0))
        );
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi tải thông tin đặt lịch.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  // Xử lý khi người dùng chọn phương thức thanh toán
  const onSubmit = async (data: PaymentFormValues) => {
    if (!bookingData || !course || !tutor) {
      toast({
        title: "Lỗi",
        description: "Thiếu thông tin đặt lịch. Vui lòng thử lại.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Import apiRequest từ queryClient
      const { apiRequest } = await import("@/lib/queryClient");

      // Kiểm tra xem user có tồn tại không
      if (!user || !user.id) {
        throw new Error(
          "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
        );
      }

      // Tạo dữ liệu để gửi lên server với student_id từ Redux store và convert decimal sang string
      const paymentData = {
        ...bookingData,
        tutor_id: parseInt(bookingData.tutorId),
        course_id: parseInt(bookingData.courseId),
        paymentMethod: data.paymentMethod === "offline" ? "direct" : "online",
        student_id: user.id,
        hourly_rate: course.pricePerSession.toString(),
        totalHours: totalHours.toString(),
        totalAmount: totalAmount.toString(),
      }; // Gửi request tới server
      const response = await apiRequest(
        "POST",
        "/api/v1/bookings",
        paymentData
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Có lỗi xảy ra khi thanh toán");
      }

      // Lấy kết quả từ response
      const result = await response.json();
      console.log("Payment response:", result); // Xử lý thành công
      // Xóa dữ liệu khỏi localStorage
      localStorage.removeItem("bookingData");
      localStorage.removeItem("selectedCourse");
      localStorage.removeItem("selectedTutor");

      if (data.paymentMethod === "online") {
        toast({
          title: "Đặt lịch thành công",
          description: "Vui lòng tiến hành thanh toán để hoàn tất đặt lịch.",
        });

        // Nếu thanh toán trực tuyến, chuyển đến trang thanh toán thực tế
        if (result.paymentUrl) {
          setTimeout(() => {
            window.location.href = result.paymentUrl;
          }, 2000);
        } else {
          setTimeout(() => {
            navigate("/student-dashboard");
          }, 2000);
        }
      } else {
        // Hiển thị modal thành công với nút chuyển hướng đến trang quản lý đặt lịch
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      toast({
        title: "Thanh toán thất bại",
        description:
          error.message ||
          "Có lỗi xảy ra khi thanh toán. Vui lòng thử lại sau.",
        variant: "destructive",
      });
      console.error("Payment error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-10 flex justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary/70 mb-4" />
            <p>Đang tải thông tin thanh toán...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!bookingData || !course || !tutor) {
    return (
      <MainLayout>
        <div className="container py-10">
          <Card>
            <CardHeader>
              <CardTitle>Không tìm thấy thông tin đặt lịch</CardTitle>
              <CardDescription>
                Không thể tải thông tin đặt lịch học. Vui lòng quay lại trang
                đặt lịch để thử lại.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate("/tutors")}>Tìm gia sư</Button>
            </CardFooter>
          </Card>
        </div>
      </MainLayout>
    );
  }
  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <nav className="flex items-center space-x-2 text-sm mb-6">
          <a
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Trang chủ
          </a>
          <span className="text-muted-foreground">/</span>
          <a
            href="/tutors"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Gia sư
          </a>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Thanh toán</span>
        </nav>

        <h1 className="text-3xl font-bold mb-8">Thanh toán</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main payment form */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Chọn phương thức thanh toán</CardTitle>
                <CardDescription>
                  Vui lòng chọn phương thức thanh toán phù hợp với bạn
                </CardDescription>
              </CardHeader>{" "}
              <CardContent className="flex-1">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem className="space-y-5">
                          <FormLabel className="text-base font-medium">
                            Phương thức thanh toán
                          </FormLabel>{" "}
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid grid-cols-1 gap-4"
                            >
                              <div className="border rounded-md p-5 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all relative">
                                <RadioGroupItem
                                  value="online"
                                  id="online"
                                  className="absolute top-5 left-5"
                                />
                                <div className="pl-8 grid gap-2">
                                  <label
                                    htmlFor="online"
                                    className="font-medium cursor-pointer flex items-center gap-2"
                                  >
                                    <CreditCardIcon className="w-5 h-5 text-primary" />
                                    Thanh toán trực tuyến
                                  </label>
                                  <div className="text-sm text-muted-foreground pl-7">
                                    Thanh toán qua thẻ tín dụng, ví điện tử
                                    (MoMo, ZaloPay)
                                  </div>
                                </div>
                              </div>

                              <div className="border rounded-md p-5 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all relative">
                                <RadioGroupItem
                                  value="offline"
                                  id="offline"
                                  className="absolute top-5 left-5"
                                />
                                <div className="pl-8 grid gap-2">
                                  <label
                                    htmlFor="offline"
                                    className="font-medium cursor-pointer flex items-center gap-2"
                                  >
                                    <BanknoteIcon className="w-5 h-5 text-green-600" />
                                    Thanh toán trực tiếp
                                  </label>
                                  <div className="text-sm text-muted-foreground pl-7">
                                    Thanh toán trực tiếp tại buổi học đầu tiên
                                  </div>
                                </div>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>{" "}
              <CardFooter className="flex-col sm:flex-row gap-4 pt-6 border-t mt-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => window.history.back()}
                >
                  Quay lại
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={!form.formState.isValid || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    "Xác nhận thanh toán"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar with booking summary */}
          <div className="lg:col-span-1 space-y-6 self-start">
            {/* Course information card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Thông tin khóa học</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-base md:text-lg mb-1">
                      {course.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline" className="bg-primary/5">
                        {typeof course.subject === "object" &&
                        course.subject !== null
                          ? course.subject.name
                          : course.subject}
                      </Badge>
                      <Badge variant="outline" className="bg-primary/5">
                        {typeof course.educationLevel === "object" &&
                        course.educationLevel !== null
                          ? course.educationLevel.name
                          : course.educationLevel}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Thời lượng:</span>
                      <span className="font-medium">{course.duration}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Học phí:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(course.pricePerSession)}
                        /Giờ
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Hình thức:</span>
                      <span>
                        {bookingData.mode === "online" ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700"
                          >
                            <MonitorSmartphone className="w-3 h-3 mr-1" />
                            Học trực tuyến
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700"
                          >
                            <MapPin className="w-3 h-3 mr-1" />
                            Học trực tiếp
                          </Badge>
                        )}
                      </span>
                    </div>
                    {bookingData.mode === "offline" && bookingData.location && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Địa điểm:</span>
                        <span className="text-sm text-right max-w-[60%]">
                          {bookingData.location}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>{" "}
            </Card>

            {/* Booking details card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Chi tiết lịch học</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    {bookingData.bookings.map((booking, index) => {
                      const date = new Date(booking.date);
                      const formattedDate = format(date, "EEEE, dd/MM/yyyy", {
                        locale: vi,
                      });

                      return (
                        <div
                          key={index}
                          className="flex flex-col space-y-1.5 border rounded-md p-3"
                        >
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                            {formattedDate}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {booking.startTime} - {booking.endTime}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Separator />
                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tổng số buổi:</span>
                      <span className="font-medium">
                        {bookingData.bookings.length} buổi
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tổng số giờ:</span>
                      <span className="font-medium">{totalHours} giờ</span>
                    </div>
                    {bookingData.note && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4" />
                          Lời nhắn:
                        </p>
                        <div className="text-sm bg-muted/40 p-3 rounded-md">
                          {bookingData.note}
                        </div>
                      </div>
                    )}{" "}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tutor information card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Thông tin gia sư</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex items-start gap-3 mb-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={tutor.user?.avatar}
                      alt={
                        tutor.user
                          ? `${tutor.user.first_name} ${tutor.user.last_name}`
                          : "Tutor"
                      }
                    />
                    <AvatarFallback>
                      {tutor.user
                        ? (tutor.user.first_name?.charAt(0) || "") +
                          (tutor.user.last_name?.charAt(0) || "")
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-base">
                      {tutor.user
                        ? `${tutor.user.first_name} ${tutor.user.last_name}`
                        : "Tutor"}
                    </h3>
                    <div className="flex items-center gap-1 my-1">
                      <span className="text-sm font-medium text-amber-500">
                        {tutor.rating || 0}
                      </span>
                      <span className="text-amber-500 flex">
                        {"★".repeat(Math.round(tutor.rating || 0))}
                        {"☆".repeat(5 - Math.round(tutor.rating || 0))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({tutor.total_reviews || 0} đánh giá)
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tutor.experience_years
                        ? `${tutor.experience_years} năm kinh nghiệm giảng dạy`
                        : "Chưa có thông tin kinh nghiệm"}
                    </p>
                  </div>
                </div>{" "}
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Email:</span>{" "}
                    {tutor.user?.email || "Chưa có thông tin"}
                  </p>
                  <p className="text-sm flex items-center gap-2">
                    <span className="font-medium">Xác minh:</span>{" "}
                    {tutor.is_verified ? (
                      <span className="inline-flex items-center bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Đã xác minh
                      </span>
                    ) : (
                      <span className="inline-flex items-center bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                        Chưa xác minh
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
            {/* Payment summary card */}
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Tổng thanh toán</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Giá mỗi giờ:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(course.pricePerSession)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tổng giờ học:</span>
                      <span className="font-medium">{totalHours} giờ</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-lg font-medium pt-2">
                      <span>Tổng tiền:</span>
                      <span className="text-primary">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(totalAmount)}
                      </span>
                    </div>
                  </div>{" "}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>{" "}
      <BookingSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate("/");
        }}
        onViewBookings={() => {
          setShowSuccessModal(false);
          navigate("dashboard/student/bookings");
        }}
      />
    </MainLayout>
  );
}

// Success Modal Component
function BookingSuccessModal({
  isOpen,
  onClose,
  onViewBookings,
}: {
  isOpen: boolean;
  onClose: () => void;
  onViewBookings: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            Đặt lịch thành công
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Yêu cầu đặt lịch đã được gửi và đang chờ gia sư xác nhận. Vui lòng
            thanh toán tại buổi học đầu tiên.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Quay lại trang chủ
          </Button>
          <Button onClick={onViewBookings} className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Xem trạng thái đặt lịch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
