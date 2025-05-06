import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { CalendarIcon, Loader2, InfoIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// Schema xác thực cho form đặt lịch
const bookingFormSchema = z.object({
  title: z.string().min(5, "Tiêu đề cần ít nhất 5 ký tự"),
  description: z.string().min(10, "Mô tả cần ít nhất 10 ký tự"),
  teaching_mode: z.enum(["online", "offline", "both"], {
    required_error: "Vui lòng chọn hình thức dạy",
  }),
  date: z.date({
    required_error: "Vui lòng chọn ngày học",
  }),
  start_time: z.string().min(1, "Vui lòng chọn giờ bắt đầu"),
  end_time: z.string().min(1, "Giờ kết thúc là bắt buộc"),
  location: z.string().optional(),
  online_meeting_url: z.string().optional(),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

// Định nghĩa kiểu dữ liệu cho khoảng thời gian
interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface AvailabilityItem {
  type: "specific";
  date: string;
  startTime: string;
  endTime: string;
}

export default function BookingForm() {
  const [location, navigate] = useLocation();
  const { tutorId, courseId } = useParams<{ tutorId?: string; courseId?: string }>();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Record<string, TimeSlot[]>>({});
  const { user } = useSelector((state: RootState) => state.auth);

  // Fetch thông tin gia sư
  const tutorIdNum = parseInt(tutorId || "0");
  const {
    data: tutorData,
    isLoading: tutorLoading,
    error: tutorError,
  } = useQuery({
    queryKey: ["/api/v1/tutors", tutorIdNum],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/v1/tutors/${tutorIdNum}`);
      return res.json();
    },
    enabled: !!tutorIdNum && tutorIdNum > 0,
  });

  // Fetch thông tin khóa học nếu có
  const courseIdNum = courseId ? parseInt(courseId) : null;
  const {
    data: courseData,
    isLoading: courseLoading,
    error: courseError,
  } = useQuery({
    queryKey: ["/api/v1/courses", courseIdNum],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/v1/courses/${courseIdNum}`);
      return res.json();
    },
    enabled: !!courseIdNum && courseIdNum > 0,
  });

  // Khởi tạo form
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      title: "",
      description: "",
      teaching_mode: "online",
      start_time: "",
      end_time: "",
      location: "",
      online_meeting_url: "",
      notes: "",
    },
  });

  // Xử lý khi submit form
  const onSubmit = async (values: BookingFormValues) => {
    try {
      setIsSubmitting(true);

      // Lấy thành phần date từ đối tượng Date và tạo chuỗi ngày chuẩn
      const date = values.date as Date;
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // getMonth() trả về 0-11
      const day = date.getDate();
      
      // Tạo chuỗi ngày chuẩn yyyy-MM-dd
      const datePart = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      console.log("Ngày gốc:", date);
      console.log("Ngày đã xử lý:", datePart);
      
      // Đảm bảo giờ có đúng định dạng HH:MM
      let startTimeStr = values.start_time;
      if (startTimeStr.length === 4) {
        startTimeStr = "0" + startTimeStr;
      }
      
      let endTimeStr = values.end_time;
      if (endTimeStr.length === 4) {
        endTimeStr = "0" + endTimeStr;
      }

      // Tạo dữ liệu đặt lịch với định dạng mới
      const bookingData = {
        tutor_id: tutorIdNum,
        title: values.title,
        description: values.description || "",
        teaching_mode: values.teaching_mode,
        location: values.teaching_mode === "online" ? "" : values.location || "",
        meeting_url: values.teaching_mode === "offline" ? "" : values.online_meeting_url || "",
        // Gửi ngày và giờ riêng biệt thay vì dạng ISO string
        date: datePart,
        start_time: startTimeStr,
        end_time: endTimeStr,
        // Đảm bảo course_id là số hoặc undefined (không phải null)
        ...(courseIdNum ? { course_id: courseIdNum } : {}),
        notes: values.notes || "",
        // Đảm bảo hourly_rate là số
        hourly_rate: Number(tutorData?.hourly_rate || 0),
      };

      console.log("Dữ liệu đặt lịch gửi đi:", bookingData);

      // Gửi yêu cầu tạo booking đến API
      const response = await apiRequest("POST", "/api/v1/bookings", bookingData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Có lỗi xảy ra khi đặt lịch");
      }

      const result = await response.json();
      
      toast({
        title: "Đặt lịch thành công",
        description: "Bạn sẽ được chuyển hướng đến trang thanh toán",
        duration: 5000,
      });

      // Chuyển hướng đến trang thanh toán nếu có
      if (result.payment_url) {
        window.location.href = result.payment_url;
      } else {
        navigate("/dashboard/student");
      }
    } catch (error: any) {
      console.error("Lỗi khi đặt lịch:", error);
      toast({
        title: "Đặt lịch thất bại",
        description: error.message || "Vui lòng thử lại sau",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý dữ liệu lịch trống từ gia sư
  useEffect(() => {
    if (!tutorData || !tutorData.availability) return;

    try {
      // Parse dữ liệu lịch trống từ string JSON (nếu cần)
      const availabilityData = typeof tutorData.availability === 'string'
        ? JSON.parse(tutorData.availability)
        : tutorData.availability;

      if (!Array.isArray(availabilityData) || availabilityData.length === 0) {
        console.log("Không có dữ liệu lịch trống hoặc dữ liệu không đúng định dạng");
        return;
      }

      console.log("Dữ liệu lịch trống gốc:", availabilityData);

      // Lọc chỉ lấy các mục có type là "specific" (ngày cụ thể)
      const specificSlots = availabilityData.filter(
        (slot: any) => slot.type === "specific" && slot.date && slot.startTime && slot.endTime
      ).map(slot => ({
        type: slot.type,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime
      })) as AvailabilityItem[];

      console.log("Các khoảng thời gian cụ thể:", specificSlots);

      // Tổ chức dữ liệu theo ngày
      const slotsByDate: Record<string, TimeSlot[]> = {};
      const dates: Date[] = [];

      // Chỉ xem xét các ngày từ hôm nay trở đi
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      specificSlots.forEach(slot => {
        console.log("Đang xử lý khoảng thời gian:", slot);
        
        // QUAN TRỌNG: KHÔNG sử dụng new Date() tại đây vì nó có thể gây lỗi múi giờ
        // Thay vào đó, dùng parse năm-tháng-ngày trực tiếp từ chuỗi
        const [year, month, day] = slot.date.split("-").map(Number);
        
        // Tạo ngày mới với giờ địa phương để tránh lỗi múi giờ
        const dateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
        console.log(`Tạo ngày từ ${year}-${month}-${day}:`, dateObj.toISOString());
        
        // Chỉ xem xét ngày hợp lệ và trong tương lai
        if (!isNaN(dateObj.getTime()) && dateObj >= today) {
          // Sử dụng date string như nó được lưu trữ, không chuyển đổi
          const dateStr = slot.date;
          
          // Thêm khoảng thời gian vào ngày
          if (!slotsByDate[dateStr]) {
            slotsByDate[dateStr] = [];
            dates.push(dateObj);
          }
          
          // Chuẩn hóa giờ bắt đầu, đảm bảo định dạng HH:MM
          let startTime = slot.startTime || "08:00";
          if (startTime.length === 4) {
            startTime = "0" + startTime;
          }
          
          // Chuẩn hóa giờ kết thúc, đảm bảo định dạng HH:MM
          let endTime = slot.endTime || "17:00";
          if (endTime.length === 4) {
            endTime = "0" + endTime;
          }
          
          slotsByDate[dateStr].push({
            startTime: startTime,
            endTime: endTime
          });
        }
      });

      console.log("Dữ liệu lịch trống đã xử lý:", slotsByDate);
      console.log("Các ngày có lịch trống:", dates);
      
      setAvailableDates(dates);
      setAvailableTimeSlots(slotsByDate);

    } catch (error) {
      console.error("Lỗi khi xử lý dữ liệu lịch trống của gia sư:", error);
    }
  }, [tutorData]);

  // Lấy danh sách giờ bắt đầu có sẵn cho ngày đã chọn
  const getAvailableStartTimes = (selectedDate: Date | undefined): string[] => {
    if (!selectedDate) return [];

    // Lấy về năm, tháng, ngày từ ngày đã chọn để so sánh chính xác
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1; // getMonth() trả về 0-11, cần +1
    const day = selectedDate.getDate();
    
    // Tạo chuỗi ngày chuẩn yyyy-MM-dd
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    console.log("Tìm kiếm lịch trống cho ngày:", dateStr);
    console.log("Dữ liệu lịch trống hiện có:", availableTimeSlots);
    
    // Thử tìm lịch trống theo định dạng chuẩn yyyy-MM-dd
    let slots = availableTimeSlots[dateStr] || [];
    
    if (slots.length === 0) {
      console.log(`Không có khoảng thời gian nào cho ngày ${dateStr} trong định dạng chuẩn`);
      
      // Duyệt qua tất cả các ngày trong availableTimeSlots để tìm ngày phù hợp
      for (const key in availableTimeSlots) {
        // Phân tích key (yyyy-MM-dd) thành các thành phần để so sánh
        const [keyYear, keyMonth, keyDay] = key.split("-").map(Number);
        
        // So sánh từng thành phần riêng lẻ
        const isSameDate = 
          year === keyYear && 
          month === keyMonth && 
          day === keyDay;
        
        console.log(`So sánh ${year}-${month}-${day} với ${key} (${keyYear}-${keyMonth}-${keyDay}): ${isSameDate}`);
        
        if (isSameDate) {
          console.log(`Tìm thấy ngày phù hợp: ${key}`);
          slots = availableTimeSlots[key];
          break;
        }
      }
    }
    
    if (slots.length === 0) {
      console.log(`Không tìm thấy khoảng thời gian nào cho ngày ${dateStr}`);
      return [];
    }

    // Trả về danh sách giờ bắt đầu đã sắp xếp
    return slots.map(slot => slot.startTime).sort();
  };

  // Cập nhật giờ kết thúc dựa trên giờ bắt đầu
  const updateEndTime = (startTime: string) => {
    const selectedDate = form.getValues("date");
    if (!selectedDate || !startTime) return;

    // Lấy về năm, tháng, ngày từ ngày đã chọn để so sánh chính xác
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1; // getMonth() trả về 0-11, cần +1
    const day = selectedDate.getDate();
    
    // Tạo chuỗi ngày chuẩn yyyy-MM-dd
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    console.log("Tìm khoảng thời gian cho ngày và giờ:", dateStr, startTime);
    
    // Cố gắng tìm slots từ tất cả các định dạng ngày có thể
    let slots = availableTimeSlots[dateStr] || [];
    
    if (slots.length === 0) {
      // Duyệt qua tất cả các ngày trong availableTimeSlots để tìm ngày phù hợp
      for (const key in availableTimeSlots) {
        // Phân tích key (yyyy-MM-dd) thành các thành phần để so sánh
        const [keyYear, keyMonth, keyDay] = key.split("-").map(Number);
        
        // So sánh từng thành phần riêng lẻ
        const isSameDate = 
          year === keyYear && 
          month === keyMonth && 
          day === keyDay;
        
        console.log(`So sánh trong updateEndTime: ${year}-${month}-${day} với ${key}: ${isSameDate}`);
        
        if (isSameDate) {
          slots = availableTimeSlots[key];
          break;
        }
      }
    }
    
    // Tìm khoảng thời gian tương ứng với giờ bắt đầu
    const matchedSlot = slots.find(slot => slot.startTime === startTime);
    
    if (matchedSlot) {
      console.log(`Tìm thấy khoảng thời gian: ${startTime} - ${matchedSlot.endTime}`);
      form.setValue("end_time", matchedSlot.endTime);
    } else {
      console.log(`Không tìm thấy khoảng thời gian cho giờ bắt đầu ${startTime}`);
      
      // Tính giờ kết thúc mặc định (1 giờ sau giờ bắt đầu)
      const [hour, minute] = startTime.split(":").map(Number);
      let endHour = hour + 1;
      if (endHour > 23) endHour = 23;
      
      const endTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      form.setValue("end_time", endTime);
    }
  };

  // Theo dõi thay đổi của ngày và cập nhật giờ bắt đầu/kết thúc
  useEffect(() => {
    const date = form.watch("date");
    
    if (date) {
      // Reset giờ bắt đầu và kết thúc
      form.setValue("start_time", "");
      form.setValue("end_time", "");
      
      // Kiểm tra nếu có giờ trống cho ngày đã chọn
      const availableTimes = getAvailableStartTimes(date);
      
      if (availableTimes.length > 0) {
        // Tự động chọn giờ bắt đầu đầu tiên
        form.setValue("start_time", availableTimes[0]);
        // Cập nhật giờ kết thúc tương ứng
        updateEndTime(availableTimes[0]);
      }
    }
  }, [form.watch("date")]);

  // Theo dõi thay đổi của giờ bắt đầu và cập nhật giờ kết thúc
  useEffect(() => {
    const startTime = form.watch("start_time");
    if (startTime) {
      updateEndTime(startTime);
    }
  }, [form.watch("start_time")]);

  // Theo dõi thay đổi của hình thức dạy
  useEffect(() => {
    const teachingMode = form.watch("teaching_mode");
    
    if (teachingMode === "online") {
      form.setValue("location", "");
    } else if (teachingMode === "offline") {
      form.setValue("online_meeting_url", "");
    }
  }, [form.watch("teaching_mode")]);

  // Hiển thị loading
  if (tutorLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Đang tải thông tin...</span>
      </div>
    );
  }

  // Hiển thị lỗi
  if (tutorError) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-500">Lỗi</CardTitle>
            <CardDescription>
              Không thể tải thông tin gia sư. Vui lòng thử lại sau.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => window.history.back()} variant="outline">Quay lại</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Hiển thị form khi đã tải dữ liệu thành công
  // Kiểm tra xem người dùng đã đăng nhập chưa
  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Bạn cần đăng nhập</CardTitle>
            <CardDescription>
              Vui lòng đăng nhập để đặt lịch học với gia sư.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/login")}>Đăng nhập</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Kiểm tra vai trò người dùng
  if (user.role !== "student") {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Không có quyền truy cập</CardTitle>
            <CardDescription>
              Chỉ học sinh mới có thể đặt lịch học.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => window.history.back()} variant="outline">Quay lại</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Lấy tên gia sư để hiển thị
  const tutorName = tutorData?.user?.first_name && tutorData?.user?.last_name 
    ? `${tutorData.user.first_name} ${tutorData.user.last_name}`
    : "gia sư này";

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Đặt lịch học với gia sư</CardTitle>
          <CardDescription>
            Nhập thông tin lịch học của bạn với{" "}
            <span className="font-medium">{tutorName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Thông báo khi gia sư chưa có lịch trống */}
                  {availableDates.length === 0 && (
                    <Card className="bg-amber-50 border-amber-200 mb-4">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2">
                          <CalendarIcon className="w-5 h-5 text-amber-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-800">Gia sư chưa thiết lập lịch trống</p>
                            <p className="text-sm text-amber-700 mt-1">
                              Gia sư {tutorName} chưa cập nhật lịch trống. Vui lòng liên hệ trực tiếp với gia sư 
                              hoặc quay lại sau.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tiêu đề buổi học</FormLabel>
                        <FormControl>
                          <Input placeholder="Ví dụ: Ôn tập Toán lớp 10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả buổi học</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ví dụ: Em muốn ôn tập chương trình đại số và hình học lớp 10"
                            className="h-32"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="teaching_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hình thức dạy</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn hình thức dạy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="online">Trực tuyến</SelectItem>
                            <SelectItem value="offline">Trực tiếp</SelectItem>
                            <SelectItem value="both">Cả hai</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Địa điểm (cho hình thức offline/both) */}
                  {(form.watch("teaching_mode") === "offline" || form.watch("teaching_mode") === "both") && (
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Địa điểm học</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ví dụ: 123 Nguyễn Huệ, Quận 1, TP.HCM"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Nhập địa chỉ cụ thể nơi bạn muốn học trực tiếp với gia sư
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* URL học trực tuyến (cho hình thức online/both) */}
                  {(form.watch("teaching_mode") === "online" || form.watch("teaching_mode") === "both") && (
                    <FormField
                      control={form.control}
                      name="online_meeting_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL phòng học trực tuyến (không bắt buộc)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ví dụ: https://meet.google.com/xyz-abcd-123"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Bạn có thể để trống để gia sư tạo phòng học
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ghi chú thêm (không bắt buộc)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ví dụ: Em cần gia sư mang theo tài liệu"
                            className="h-20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <InfoIcon className="w-5 h-5 text-blue-500" />
                      <h3 className="font-medium">Thông tin buổi học</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Để đặt lịch học, vui lòng chọn một ngày và giờ mà gia sư có sẵn lịch trống. 
                      Chỉ những ngày và giờ gia sư đã đăng ký lịch trống mới được hiển thị.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Ngày học</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                disabled={availableDates.length === 0}
                              >
                                {field.value ? (
                                  format(field.value, "EEEE, dd/MM/yyyy", { locale: vi })
                                ) : (
                                  <span>Chọn ngày học</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                if (date) {
                                  // Tạo một đối tượng Date mới với giờ địa phương đúng
                                  const safeDate = new Date(
                                    date.getFullYear(),
                                    date.getMonth(),
                                    date.getDate(),
                                    0, 0, 0
                                  );
                                  console.log("Ngày được chọn trên calendar:", date);
                                  console.log("Ngày sau khi xử lý:", safeDate);
                                  field.onChange(safeDate);
                                }
                              }}
                              disabled={(date) => {
                                // Xử lý lại ngày để tìm trong availableTimeSlots
                                const year = date.getFullYear();
                                const month = date.getMonth() + 1;
                                const day = date.getDate();
                                const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                
                                // Kiểm tra xem ngày có trong danh sách availableDates không
                                let exists = false;
                                
                                // Kiểm tra trực tiếp trong availableTimeSlots
                                if (availableTimeSlots[dateStr] && availableTimeSlots[dateStr].length > 0) {
                                  exists = true;
                                }
                                
                                // Tìm kiếm chính xác theo năm/tháng/ngày
                                if (!exists) {
                                  for (const key in availableTimeSlots) {
                                    const [keyYear, keyMonth, keyDay] = key.split("-").map(Number);
                                    if (year === keyYear && month === keyMonth && day === keyDay) {
                                      exists = true;
                                      break;
                                    }
                                  }
                                }
                                
                                return !exists;
                              }}
                              initialFocus
                              locale={vi}
                              weekStartsOn={1}
                            />
                          </PopoverContent>
                        </Popover>
                        {availableDates.length === 0 && (
                          <p className="text-xs text-amber-600">
                            Gia sư chưa thiết lập lịch trống
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chọn khung giờ học</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            updateEndTime(value);
                          }}
                          value={field.value}
                          disabled={!form.watch("date") || getAvailableStartTimes(form.watch("date")).length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn khung giờ học" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {form.watch("date") && getAvailableStartTimes(form.watch("date")).length > 0 ? (
                              getAvailableStartTimes(form.watch("date")).map((time: string) => {
                                // Tìm khoảng thời gian tương ứng để hiển thị giờ kết thúc
                                const selectedDate = form.watch("date");
                                const year = selectedDate.getFullYear();
                                const month = selectedDate.getMonth() + 1;
                                const day = selectedDate.getDate();
                                const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                
                                // Tìm slots từ cả hai nguồn
                                let slots = availableTimeSlots[dateStr] || [];
                                
                                // Nếu không tìm thấy, thử tìm với cùng năm/tháng/ngày
                                if (slots.length === 0) {
                                  for (const key in availableTimeSlots) {
                                    const [keyYear, keyMonth, keyDay] = key.split("-").map(Number);
                                    if (year === keyYear && month === keyMonth && day === keyDay) {
                                      slots = availableTimeSlots[key];
                                      break;
                                    }
                                  }
                                }
                                
                                const matchedSlot = slots.find(slot => slot.startTime === time);
                                
                                if (!matchedSlot) return null;
                                
                                return (
                                  <SelectItem key={time} value={time}>
                                    <span className="font-medium">{time} → {matchedSlot.endTime}</span>
                                    {(() => {
                                      // Tính thời gian học
                                      const [startHour, startMin] = time.split(":").map(Number);
                                      const [endHour, endMin] = matchedSlot.endTime.split(":").map(Number);
                                      
                                      const startMinutes = startHour * 60 + startMin;
                                      const endMinutes = endHour * 60 + endMin;
                                      
                                      const diffMinutes = endMinutes - startMinutes;
                                      const hours = Math.floor(diffMinutes / 60);
                                      const minutes = diffMinutes % 60;
                                      
                                      return (
                                        <span className="text-xs text-muted-foreground ml-2">
                                          ({hours} giờ{minutes > 0 ? ` ${minutes} phút` : ""})
                                        </span>
                                      );
                                    })()}
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <SelectItem value="no-slots" disabled>
                                Không có khung giờ trống
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {form.watch("start_time") && form.watch("end_time") && (
                          <div className="text-sm text-muted-foreground mt-1 flex items-center">
                            <div className="bg-primary/10 text-primary rounded-md px-2 py-1 font-medium">
                              {form.watch("start_time")} → {form.watch("end_time")}
                            </div>
                            <input 
                              type="hidden" 
                              name="end_time" 
                              value={form.watch("end_time")} 
                            />
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2">Thông tin thanh toán</h3>
                    <Separator className="mb-4" />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Giá mỗi giờ:</span>
                        <span className="font-medium">
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(
                            adData?.hourly_rate || (tutorData?.hourly_rate ? Number(tutorData.hourly_rate) : 0)
                          )}
                        </span>
                      </div>
                      
                      {form.watch("start_time") && form.watch("end_time") && (
                        <>
                          <div className="flex justify-between">
                            <span>Thời gian học:</span>
                            <span>
                              {(() => {
                                if (!form.watch("start_time") || !form.watch("end_time")) {
                                  return "0 giờ";
                                }
                                
                                const [startHour, startMin] = form.watch("start_time").split(":").map(Number);
                                const [endHour, endMin] = form.watch("end_time").split(":").map(Number);
                                
                                const startMinutes = startHour * 60 + startMin;
                                const endMinutes = endHour * 60 + endMin;
                                
                                const diffMinutes = endMinutes - startMinutes;
                                const hours = Math.floor(diffMinutes / 60);
                                const minutes = diffMinutes % 60;
                                
                                return `${hours} giờ${minutes > 0 ? ` ${minutes} phút` : ""}`;
                              })()}
                            </span>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex justify-between text-lg font-medium">
                            <span>Tổng tiền:</span>
                            <span>
                              {(() => {
                                if (!form.watch("start_time") || !form.watch("end_time")) {
                                  return "0 VNĐ";
                                }
                                
                                const [startHour, startMin] = form.watch("start_time").split(":").map(Number);
                                const [endHour, endMin] = form.watch("end_time").split(":").map(Number);
                                
                                const startMinutes = startHour * 60 + startMin;
                                const endMinutes = endHour * 60 + endMin;
                                
                                const diffMinutes = endMinutes - startMinutes;
                                const hours = diffMinutes / 60;
                                
                                const hourlyRate = adData?.hourly_rate || (tutorData?.hourly_rate ? Number(tutorData.hourly_rate) : 0);
                                const totalAmount = hourlyRate * hours;
                                
                                return new Intl.NumberFormat("vi-VN", {
                                  style: "currency",
                                  currency: "VND",
                                }).format(totalAmount);
                              })()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="mt-4 border rounded-md p-4 bg-muted/30">
                      <h4 className="text-sm font-medium mb-2">Phương thức thanh toán</h4>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="payment-method-vnpay"
                            name="payment-method"
                            className="mr-2"
                            defaultChecked
                          />
                          <label htmlFor="payment-method-vnpay" className="text-sm flex items-center">
                            <img 
                              src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Icon-VNPAY-QR.png" 
                              alt="VNPAY" 
                              className="h-6 w-auto mr-2" 
                            />
                            Thanh toán qua VNPAY
                          </label>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Sau khi đặt lịch, bạn sẽ được chuyển đến cổng thanh toán VNPAY để hoàn tất giao dịch.
                          Số tiền thanh toán sẽ được giữ lại cho đến khi buổi học kết thúc.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Hủy
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || availableDates.length === 0} 
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    "Xác nhận đặt lịch và thanh toán"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}