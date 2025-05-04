import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { addDays, format, parse, isSameDay } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Calendar as CalendarIcon, Loader2, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// Validation schema
const bookingFormSchema = z.object({
  title: z.string().min(5, "Tiêu đề phải có ít nhất 5 ký tự"),
  description: z.string().optional(),
  date: z.date({
    required_error: "Vui lòng chọn ngày học",
  }),
  start_time: z.string({
    required_error: "Vui lòng chọn giờ bắt đầu",
  }),
  end_time: z.string({
    required_error: "Vui lòng chọn giờ kết thúc",
  }),
  location: z.string().optional(),
  meeting_url: z.string().url().optional(),
  teaching_mode: z.enum(["online", "offline", "both"]),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export default function BookingForm() {
  const { tutorId, adId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Thông tin gia sư
  const {
    data: tutorData,
    isLoading: tutorLoading,
    error: tutorError,
  } = useQuery({
    queryKey: ["/api/v1/tutors", tutorId],
    queryFn: () => fetch(`/api/v1/tutors/${tutorId}`).then((res) => res.json()),
    enabled: !!tutorId,
  });

  // Thông tin quảng cáo (nếu có)
  const {
    data: adData,
    isLoading: adLoading,
  } = useQuery({
    queryKey: ["/api/v1/ads", adId],
    queryFn: () => fetch(`/api/v1/tutors/ads/${adId}`).then((res) => res.json()),
    enabled: !!adId,
  });

  // Chuyển tiếng việt thành tiếng anh cho teaching mode
  const getTeachingModeInEnglish = (mode: string) => {
    switch (mode) {
      case "Trực tuyến":
        return "online";
      case "Trực tiếp":
        return "offline";
      case "Cả hai":
        return "both";
      default:
        return mode.toLowerCase();
    }
  };

  // Form setup
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      title: adData?.title || "",
      description: adData?.description || "",
      date: undefined, // Không đặt ngày mặc định để bắt buộc người dùng chọn
      start_time: "",  // Không đặt giờ mặc định
      end_time: "",    // Không đặt giờ mặc định
      location: adData?.location || "",
      meeting_url: "",
      teaching_mode: (adData?.teaching_mode 
        ? getTeachingModeInEnglish(adData.teaching_mode)
        : "both") as "online" | "offline" | "both",
    },
  });

  // Tạo booking mới
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await apiRequest("POST", "/api/v1/bookings", bookingData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/student/bookings"] });
      navigate("/student-dashboard?tab=bookings");
    },
    onError: (error: any) => {
      console.error("Booking error:", error);
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (values: BookingFormValues) => {
    if (!user || !tutorData) {
      return;
    }

    setIsSubmitting(true);

    // Tính toán thời gian bắt đầu và kết thúc
    const datePart = format(values.date, "yyyy-MM-dd");
    const startDateTime = parse(
      `${datePart} ${values.start_time}`,
      "yyyy-MM-dd HH:mm",
      new Date()
    );
    const endDateTime = parse(
      `${datePart} ${values.end_time}`,
      "yyyy-MM-dd HH:mm",
      new Date()
    );

    // Tính toán giá
    const hourlyRate = adData?.hourly_rate || tutorData.hourly_rate || 0;

    // Prepare booking data
    const bookingData = {
      tutor_id: parseInt(tutorId!),
      ad_id: adId ? parseInt(adId) : undefined,
      title: values.title,
      description: values.description || "",
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      location: values.location || "",
      meeting_url: values.meeting_url || "",
      hourly_rate: hourlyRate,
      teaching_mode: values.teaching_mode,
    };

    try {
      await createBookingMutation.mutateAsync(bookingData);
    } catch (error) {
      console.error("Error creating booking:", error);
      setIsSubmitting(false);
    }
  };

  // Khung giờ trống của gia sư (trong thực tế, bạn sẽ cần lấy dữ liệu này từ API)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{[key: string]: string[]}>({});
  
  // Xử lý dữ liệu availability từ profile của gia sư
  useEffect(() => {
    try {
      if (tutorData && tutorData.availability) {
        // Nếu availability đã là JSON object thì không cần parse
        const availabilityData = typeof tutorData.availability === 'string' 
          ? JSON.parse(tutorData.availability) 
          : tutorData.availability;
        
        console.log("Dữ liệu lịch trống nhận được:", JSON.stringify(availabilityData));
        
        // Kiểm tra nếu availabilityData là mảng rỗng hoặc không phải là mảng
        if (!Array.isArray(availabilityData) || availabilityData.length === 0) {
          console.log("Gia sư chưa thiết lập lịch trống hoặc có lỗi dữ liệu.");
          // Thiết lập state rỗng nhưng vẫn có cấu trúc cần thiết
          setAvailableTimeSlots({
            _timeRanges: {},
            _specificDates: {},
            _hasSpecificDates: false,
            _empty: true // Đánh dấu là không có lịch trống
          });
          return;
        }
        
        // Tạo object mới để lưu trữ thông tin về các khoảng thời gian theo ngày
        const slots: {[key: string]: string[]} = {};
        const timeRanges: {[key: string]: Array<{startTime: string, endTime: string}>} = {};
        // Dùng để lưu trữ thông tin về các ngày cụ thể có lịch trống
        const specificDates: {[key: string]: boolean} = {};
        
        // Ánh xạ tên ngày sang số ngày trong tuần (JavaScript getDay trả về 0 = Sunday, 1 = Monday, ...)
        const dayMap: {[key: string]: string} = {
          'sunday': '0',
          'monday': '1',
          'tuesday': '2',
          'wednesday': '3',
          'thursday': '4',
          'friday': '5',
          'saturday': '6'
        };
        
        // Reset form values để đảm bảo không có giá trị mặc định
        form.setValue("start_time", "");
        form.setValue("end_time", "");
        
        // Kiểm tra xem có ngày cụ thể trong dữ liệu lịch trống không
        const hasSpecificDate = availabilityData.some((slot: any) => slot.specificDate);
        
        // Tổ chức lại các khoảng thời gian theo ngày
        availabilityData.forEach((slot: any) => {
          let keyDate: string;
          
          if (slot.specificDate) {
            // Nếu có ngày cụ thể, sử dụng ngày đó làm khóa
            keyDate = slot.specificDate; // Giả sử format là YYYY-MM-DD
            specificDates[keyDate] = true;
          } else if (slot.day) {
            // Nếu không có ngày cụ thể, sử dụng ngày trong tuần
            const dayNumber = dayMap[slot.day.toLowerCase()];
            if (!dayNumber) return;
            keyDate = `day_${dayNumber}`;
          } else {
            // Nếu không có cả ngày cụ thể và ngày trong tuần, bỏ qua slot này
            console.warn("Slot không có thông tin ngày:", slot);
            return;
          }
          
          // Kiểm tra xem slot có đầy đủ thông tin thời gian bắt đầu và kết thúc không
          if (!slot.startTime || !slot.endTime) {
            console.warn("Slot thiếu thông tin thời gian:", slot);
            return;
          }
          
          // Lưu khoảng thời gian đầy đủ
          if (!timeRanges[keyDate]) {
            timeRanges[keyDate] = [];
          }
          
          timeRanges[keyDate].push({
            startTime: slot.startTime,
            endTime: slot.endTime
          });
          
          // Kiểm tra thời gian hợp lệ
          const [startHour, startMin] = slot.startTime.split(':').map(Number);
          const [endHour, endMin] = slot.endTime.split(':').map(Number);
          
          if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
            console.warn("Định dạng thời gian không hợp lệ:", slot);
            return;
          }
          
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          if (startMinutes >= endMinutes) {
            console.warn("Thời gian bắt đầu lớn hơn hoặc bằng thời gian kết thúc:", slot);
            return;
          }
          
          // Tạo danh sách các thời điểm có thể bắt đầu (30 phút một)
          if (!slots[keyDate]) {
            slots[keyDate] = [];
          }
          
          // Thêm thời gian bắt đầu chính xác từ dữ liệu gia sư
          const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
          if (startHour >= 6 && startHour < 22) {
            slots[keyDate].push(startTimeStr);
          }
          
          // Thêm các thời điểm 30 phút từ lúc bắt đầu đến trước khi kết thúc
          // Bắt đầu từ giờ đầu tiên sau khi làm tròn lên đến 30p hoặc 00p
          const roundedStart = Math.ceil(startMinutes / 30) * 30;
          
          // Tính toán số phút kết thúc - 60p (thời gian tối thiểu cho một buổi học)
          const maxStartMinutes = endMinutes - 60;
          
          // Thêm tất cả các điểm bắt đầu có thể trong khoảng thời gian này
          for (let minute = roundedStart; minute <= maxStartMinutes; minute += 30) {
            const hour = Math.floor(minute / 60);
            const min = minute % 60;
            
            // Bỏ qua nếu giờ nằm ngoài phạm vi 6h sáng đến 22h tối
            if (hour < 6 || hour >= 22) continue;
            
            const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            slots[keyDate].push(timeStr);
          }
        });
        
        // Loại bỏ trùng lặp và sắp xếp các thời điểm có thể bắt đầu cho mỗi ngày
        for (const keyDate in slots) {
          slots[keyDate] = Array.from(new Set(slots[keyDate])).sort();
        }
        
        console.log("Slots đã xử lý:", slots);
        console.log("TimeRanges đã xử lý:", timeRanges);
        
        // Giả định rằng API chưa trả về ngày cụ thể, ta cần tự tạo ra
        // Hiện tại, gia sư chỉ có thể chọn thứ trong tuần hoặc ngày cụ thể (05/05/2025 - Thứ 2)
        // Nếu API chưa hỗ trợ trường specificDate, chúng ta có thể thêm logic để tạm thời giả định
        // đây là ngày Thứ Hai gần nhất (ngày 05/05/2025)
        const hasDateField = availabilityData.some((slot: any) => slot.date);
        if (!hasDateField && !hasSpecificDate && Object.keys(slots).length > 0) {
          // Giả định đây là ngày cụ thể của Thứ Hai trong tuần hiện tại
          const today = new Date();
          const mondayThisWeek = new Date(today);
          const dayDiff = (1 - today.getDay() + 7) % 7; // Monday is 1, calculate days until next Monday
          mondayThisWeek.setDate(today.getDate() + dayDiff);
          
          const mondayKey = `day_1`; // key for Monday
          if (slots[mondayKey]) {
            // Format ngày YYYY-MM-DD
            const dateStr = mondayThisWeek.toISOString().split('T')[0];
            
            // Chuyển dữ liệu từ day_1 sang ngày cụ thể
            slots[dateStr] = slots[mondayKey];
            timeRanges[dateStr] = timeRanges[mondayKey];
            
            // Xóa dữ liệu ngày không cụ thể
            delete slots[mondayKey];
            delete timeRanges[mondayKey];
            
            // Đánh dấu là có ngày cụ thể
            specificDates[dateStr] = true;
          }
        }
        
        // Lưu thông tin khoảng thời gian để sử dụng khi tính toán thời gian kết thúc
        // @ts-ignore - Thêm thuộc tính tạm cho state
        setAvailableTimeSlots((prev) => ({
          ...slots,
          _timeRanges: timeRanges,
          _specificDates: specificDates,
          _hasSpecificDates: Object.keys(specificDates).length > 0,
          _empty: Object.keys(slots).length === 0 // Đánh dấu nếu không có slots nào
        }));
      } else {
        // Nếu không có dữ liệu lịch trống
        console.log("Không có dữ liệu lịch trống cho gia sư này.");
        setAvailableTimeSlots({
          _timeRanges: {},
          _specificDates: {},
          _hasSpecificDates: false,
          _empty: true
        });
      }
    } catch (error) {
      console.error("Lỗi khi xử lý dữ liệu lịch trống:", error);
      // Đảm bảo luôn có giá trị mặc định
      setAvailableTimeSlots({
        _timeRanges: {},
        _specificDates: {},
        _hasSpecificDates: false,
        _empty: true
      });
    }
  }, [tutorData]);
  
  // Lấy các ngày trong tuần có lịch trống (4 tuần tới)
  const getAvailableDays = () => {
    // Tạo mảng các ngày có lịch trống trong 4 tuần tới
    const result: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Bắt đầu từ thời điểm 00:00:00 của ngày hôm nay
    
    // @ts-ignore - Truy cập thuộc tính động
    const hasSpecificDates = availableTimeSlots._hasSpecificDates;
    
    if (hasSpecificDates) {
      // @ts-ignore - Truy cập thuộc tính động
      const specificDates = availableTimeSlots._specificDates || {};
      
      // Chỉ hiển thị những ngày cụ thể (YYYY-MM-DD)
      Object.keys(specificDates).forEach(dateStr => {
        const date = new Date(dateStr);
        // Kiểm tra ngày hợp lệ 
        if (!isNaN(date.getTime()) && date >= today) {
          result.push(date);
        }
      });
    } else {
      // 28 ngày (4 tuần)
      for (let i = 0; i < 28; i++) {
        const date = addDays(today, i);
        const dayKey = `day_${date.getDay()}`;
        
        // Chỉ thêm ngày có slot trống
        if (availableTimeSlots[dayKey] && availableTimeSlots[dayKey].length > 0) {
          result.push(date);
        }
      }
    }
    
    // Sắp xếp theo thứ tự ngày tăng dần
    return result.sort((a, b) => a.getTime() - b.getTime());
  };
  
  // Hiển thị thời gian trống cho ngày đã chọn
  const getAvailableTimesForSelectedDate = () => {
    if (!form.watch("date")) return [];
    
    const selectedDate = form.watch("date");
    
    // @ts-ignore - Truy cập thuộc tính động
    const hasSpecificDates = availableTimeSlots._hasSpecificDates;
    
    if (hasSpecificDates) {
      // Format ngày YYYY-MM-DD để tìm ngày cụ thể
      const dateStr = selectedDate.toISOString().split('T')[0];
      return availableTimeSlots[dateStr] || [];
    } else {
      // Dùng day_X để tìm theo ngày trong tuần
      const dayKey = `day_${selectedDate.getDay()}`;
      return availableTimeSlots[dayKey] || [];
    }
  };
  
  // Cập nhật khoảng thời gian khi người dùng chọn giờ bắt đầu
  const updateEndTimeBasedOnStartTime = (startTime: string) => {
    if (!startTime) return;
    
    const selectedDate = form.watch("date");
    if (!selectedDate) return;
    
    // @ts-ignore - Truy cập thuộc tính động
    const hasSpecificDates = availableTimeSlots._hasSpecificDates;
    
    // Xác định khóa để tìm khoảng thời gian
    let timeRangeKey: string;
    
    if (hasSpecificDates) {
      // Format ngày YYYY-MM-DD để tìm ngày cụ thể
      timeRangeKey = selectedDate.toISOString().split('T')[0];
    } else {
      // Dùng day_X để tìm theo ngày trong tuần
      timeRangeKey = `day_${selectedDate.getDay()}`;
    }
    
    // @ts-ignore - Truy cập thuộc tính động
    const timeRanges = availableTimeSlots._timeRanges?.[timeRangeKey] || [];
    if (timeRanges.length === 0) return;
    
    // Chuyển đổi startTime sang số phút từ nửa đêm
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    
    // Tìm khoảng thời gian phù hợp chứa thời gian bắt đầu được chọn
    let matchedRange = null;
    for (const range of timeRanges) {
      const [rangeStartHour, rangeStartMin] = range.startTime.split(':').map(Number);
      const [rangeEndHour, rangeEndMin] = range.endTime.split(':').map(Number);
      
      const rangeStartMinutes = rangeStartHour * 60 + rangeStartMin;
      const rangeEndMinutes = rangeEndHour * 60 + rangeEndMin;
      
      // Kiểm tra xem thời gian bắt đầu có nằm trong khoảng này không
      if (startMinutes >= rangeStartMinutes && startMinutes < rangeEndMinutes) {
        matchedRange = {
          start: rangeStartMinutes,
          end: rangeEndMinutes,
          startStr: range.startTime,
          endStr: range.endTime
        };
        break;
      }
    }
    
    if (matchedRange) {
      // Tính thời gian kết thúc tối đa có thể (từ thời gian bắt đầu)
      const maxEndMinutes = matchedRange.end;
      
      // Nếu có thể, đặt thời gian kết thúc là 60 phút sau giờ bắt đầu
      const idealEndMinutes = startMinutes + 60;
      const actualEndMinutes = Math.min(idealEndMinutes, maxEndMinutes);
      
      // Chuyển số phút thành định dạng giờ:phút
      const endHour = Math.floor(actualEndMinutes / 60);
      const endMin = actualEndMinutes % 60;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      // Chỉ cập nhật nếu có thay đổi hoặc chưa có giá trị
      if (form.watch("end_time") !== endTime) {
        form.setValue("end_time", endTime);
      }
      
      // Console.log để debug
      console.log(`Thời gian được chọn: ${startTime}, Khoảng thời gian phù hợp: ${matchedRange.startStr}-${matchedRange.endStr}`);
      console.log(`Đặt thời gian kết thúc: ${endTime}`);
    } else {
      console.log(`Không tìm thấy khoảng thời gian phù hợp cho ${startTime} vào ngày ${timeRangeKey}`);
      
      // Tìm khoảng thời gian gần nhất (nếu có)
      if (timeRanges.length > 0) {
        // Kiểm tra khoảng thời gian khả dụng
        const availableTimePoints = getAvailableTimesForSelectedDate();
        if (availableTimePoints.includes(startTime)) {
          // Nếu thời gian bắt đầu hợp lệ, tìm khoảng thời gian kết thúc phù hợp
          
          // Thêm 60 phút cho thời gian kết thúc - (nhưng giới hạn không quá 22h)
          const endMinutes = Math.min(startMinutes + 60, 22 * 60);
          const endHour = Math.floor(endMinutes / 60);
          const endMin = endMinutes % 60;
          const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
          
          form.setValue("end_time", endTime);
        } else {
          // Nếu thời gian bắt đầu không nằm trong danh sách thời gian có sẵn
          // đặt giờ bắt đầu về giá trị đầu tiên
          if (availableTimePoints.length > 0) {
            form.setValue("start_time", availableTimePoints[0]);
            updateEndTimeBasedOnStartTime(availableTimePoints[0]);
          }
        }
      } else {
        // Nếu không có khoảng thời gian nào, đặt mặc định 1 giờ sau
        const endMinutes = startMinutes + 60;
        const endHour = Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        
        form.setValue("end_time", endTime);
      }
    }
  };
  
  // Cập nhật danh sách thời gian trống khi ngày thay đổi
  useEffect(() => {
    if (form.watch("date")) {
      const availableTimes = getAvailableTimesForSelectedDate();
      
      // Nếu có thời gian trống và thời gian bắt đầu hiện tại không có trong danh sách
      if (availableTimes.length > 0) {
        // Cập nhật thời gian bắt đầu
        if (!availableTimes.includes(form.watch("start_time"))) {
          form.setValue("start_time", availableTimes[0]);
          updateEndTimeBasedOnStartTime(availableTimes[0]);
        } else {
          // Nếu thời gian bắt đầu vẫn hợp lệ, cập nhật thời gian kết thúc
          updateEndTimeBasedOnStartTime(form.watch("start_time"));
        }
      }
    }
  }, [form.watch("date")]);
  
  // Cập nhật thời gian kết thúc khi thời gian bắt đầu thay đổi
  useEffect(() => {
    if (form.watch("start_time")) {
      updateEndTimeBasedOnStartTime(form.watch("start_time"));
    }
  }, [form.watch("start_time")]);
  
  // Danh sách các ngày có lịch trống
  const availableDays = getAvailableDays();

  // Chọn giờ
  const timeOptions: string[] = [];
  for (let hour = 6; hour < 22; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, "0")}:${min
        .toString()
        .padStart(2, "0")}`;
      timeOptions.push(time);
    }
  }

  if (tutorLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (tutorError) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Lỗi</CardTitle>
            <CardDescription>
              Không thể tải thông tin gia sư. Vui lòng thử lại sau.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
            <Button onClick={() => navigate("/")}>Quay lại trang chủ</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const tutorName = tutorData?.user?.first_name + " " + tutorData?.user?.last_name;

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

                  {(form.watch("teaching_mode") === "offline" ||
                    form.watch("teaching_mode") === "both") && (
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Địa điểm</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nhập địa chỉ học"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {(form.watch("teaching_mode") === "online" ||
                    form.watch("teaching_mode") === "both") && (
                    <FormField
                      control={form.control}
                      name="meeting_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link học trực tuyến (nếu có)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ví dụ: https://meet.google.com/..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Ngày học</FormLabel>
                        {Object.keys(availableTimeSlots).length > 0 ? (
                          <div className="text-xs mb-2 text-muted-foreground">
                            (Lịch chỉ hiển thị những ngày gia sư có lịch trống)
                          </div>
                        ) : (
                          <div className="text-xs text-amber-600 mb-2">
                            Đang đồng bộ lịch với gia sư...
                          </div>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy")
                                ) : (
                                  <span>Chọn ngày</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date() || 
                                date > addDays(new Date(), 60) ||
                                !availableDays.some(d => isSameDay(d, date))
                              }
                              initialFocus
                              className="rounded-md border"
                              weekStartsOn={1}
                              showOutsideDays={false}
                              today={new Date()}
                              modifiersStyles={{
                                today: { fontWeight: 'bold', color: 'var(--primary)' },
                                outside: { color: 'var(--muted-foreground)' }
                              }}
                              modifiers={{
                                available: availableDays
                              }}
                              modifiersClassNames={{
                                available: "bg-primary/10 font-medium"
                              }}
                              footer={
                                <div className="p-3 border-t border-border/50 text-xs text-center text-muted-foreground space-y-1">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 rounded-sm bg-primary/10"></div>
                                    <span>Ngày có lịch trống</span>
                                  </div>
                                  <div>Chỉ hiển thị các ngày gia sư có thể dạy</div>
                                </div>
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Giờ bắt đầu</FormLabel>
                          {getAvailableTimesForSelectedDate().length > 0 ? (
                            <div className="text-xs mb-2 text-muted-foreground">
                              (Hiển thị các giờ gia sư có lịch trống trong ngày đã chọn)
                            </div>
                          ) : (
                            <div className="text-xs mb-2 text-amber-600">
                              Vui lòng chọn ngày có lịch trống để xem giờ trống
                            </div>
                          )}
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Reset giờ kết thúc khi đổi giờ bắt đầu
                              form.setValue("end_time", "");
                            }}
                            value={field.value}
                            disabled={!form.watch("date") || getAvailableTimesForSelectedDate().length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn giờ bắt đầu" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {form.watch("date") && getAvailableTimesForSelectedDate().length > 0 ? (
                                getAvailableTimesForSelectedDate().map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-2 py-1 text-sm text-muted-foreground">
                                  Vui lòng chọn ngày có lịch trống
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Giờ kết thúc</FormLabel>
                          {form.watch("start_time") ? (
                            <div className="text-xs mb-2 text-muted-foreground">
                              (Thời gian kết thúc được tính từ giờ bắt đầu đến hết khung giờ trống của gia sư)
                            </div>
                          ) : (
                            <div className="text-xs mb-2 text-amber-600">
                              Vui lòng chọn ngày và giờ bắt đầu trước
                            </div>
                          )}
                          <div className="relative">
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={true} // Tự động tính giờ kết thúc, không cho chọn thủ công
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn giờ kết thúc" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {field.value ? (
                                  <SelectItem value={field.value}>{field.value}</SelectItem>
                                ) : (
                                  <div className="px-2 py-1 text-sm text-muted-foreground">
                                    Tự động tính toán khi chọn giờ bắt đầu
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                            {form.watch("start_time") && (
                              <div className="absolute top-0 right-0 bottom-0 flex items-center pr-3 pointer-events-none">
                                <span className="text-xs text-muted-foreground">(Tự động)</span>
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-4">
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
                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
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