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

  // State mở rộng với các trường metadata bổ sung
  type AvailabilityState = {
    [key: string]: any;
    _timeRanges?: {[key: string]: Array<{startTime: string, endTime: string}>};
    _specificDates?: {[key: string]: boolean};
    _hasSpecificDates?: boolean;
    _empty?: boolean;
  }
  
  // Khung giờ trống của gia sư (trong thực tế, bạn sẽ cần lấy dữ liệu này từ API)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<AvailabilityState>({});
  
  // Test hàm getDayOfWeekNumber
  useEffect(() => {
    console.log("TEST getDayOfWeekNumber:");
    console.log("sunday ->", getDayOfWeekNumber("sunday"), "JS getDay():", 0);
    console.log("monday ->", getDayOfWeekNumber("monday"), "JS getDay():", 1);
    console.log("tuesday ->", getDayOfWeekNumber("tuesday"), "JS getDay():", 2);
    console.log("wednesday ->", getDayOfWeekNumber("wednesday"), "JS getDay():", 3);
    console.log("thursday ->", getDayOfWeekNumber("thursday"), "JS getDay():", 4);
    console.log("friday ->", getDayOfWeekNumber("friday"), "JS getDay():", 5);
    console.log("saturday ->", getDayOfWeekNumber("saturday"), "JS getDay():", 6);
    
    // Test how JavaScript handles dates
    const today = new Date(); // Today
    for (let i = 0; i < 7; i++) {
      const testDate = new Date(today);
      testDate.setDate(today.getDate() + i);
      console.log(`Date: ${testDate.toISOString().split('T')[0]}, Day of week: ${testDate.getDay()}, Day: ${testDate.toLocaleDateString('en-US', { weekday: 'long' })}`);
    }
  }, []);
  
  // Định nghĩa hàm ánh xạ tên ngày sang số thứ tự ngày trong tuần
  // Điều quan trọng: JavaScript Date.getDay() trả về:
  // 0 = Chủ nhật, 1 = Thứ Hai, 2 = Thứ Ba, 3 = Thứ Tư, 4 = Thứ Năm, 5 = Thứ Sáu, 6 = Thứ Bảy
  const getDayOfWeekNumber = (day: string): number => {
    // Chuyển đổi string về lowercase và loại bỏ khoảng trắng đầu/cuối
    const formattedDay = day.toLowerCase().trim();
    
    console.log(`Xử lý tên ngày: "${formattedDay}"`);
    
    // Đầu tiên kiểm tra tên ngày đầy đủ tiếng Anh
    if (formattedDay === 'sunday') return 0;
    if (formattedDay === 'monday') return 1;
    if (formattedDay === 'tuesday') return 2;
    if (formattedDay === 'wednesday') return 3;
    if (formattedDay === 'thursday') return 4;
    if (formattedDay === 'friday') return 5;
    if (formattedDay === 'saturday') return 6;
    
    // Kiểm tra tiếng Việt có dấu
    if (formattedDay === 'chủ nhật') return 0;
    if (formattedDay === 'thứ hai') return 1;
    if (formattedDay === 'thứ ba') return 2;
    if (formattedDay === 'thứ tư') return 3;
    if (formattedDay === 'thứ năm') return 4;
    if (formattedDay === 'thứ sáu') return 5;
    if (formattedDay === 'thứ bảy') return 6;
    
    // Kiểm tra tiếng Việt không dấu
    if (formattedDay === 'chu nhat') return 0;
    if (formattedDay === 'thu hai') return 1;
    if (formattedDay === 'thu ba') return 2;
    if (formattedDay === 'thu tu') return 3;
    if (formattedDay === 'thu nam') return 4;
    if (formattedDay === 'thu sau') return 5;
    if (formattedDay === 'thu bay') return 6;
    
    // Kiểm tra rút gọn cho trường hợp tuần tự (thu-2, thu-7,...)
    if (formattedDay === 't2' || formattedDay === 'th2' || formattedDay === 'thu-2') return 1;
    if (formattedDay === 't3' || formattedDay === 'th3' || formattedDay === 'thu-3') return 2;
    if (formattedDay === 't4' || formattedDay === 'th4' || formattedDay === 'thu-4') return 3;
    if (formattedDay === 't5' || formattedDay === 'th5' || formattedDay === 'thu-5') return 4;
    if (formattedDay === 't6' || formattedDay === 'th6' || formattedDay === 'thu-6') return 5;
    if (formattedDay === 't7' || formattedDay === 'th7' || formattedDay === 'thu-7') return 6;
    if (formattedDay === 'cn') return 0;
    
    // Nếu không nhận dạng được thì in log và trả về undefined
    console.warn(`Không nhận dạng được ngày trong tuần: '${formattedDay}'`);
    return undefined as any;
  };

  // Hàm tìm ngày tiếp theo tính từ ngày hiện tại có thứ tương ứng
  const getNextWeekdayDate = (weekday: string): Date => {
    const dayNumber = getDayOfWeekNumber(weekday);
    if (dayNumber === undefined) {
      console.error(`Không thể tìm ngày tiếp theo cho thứ: ${weekday}, không nhận dạng được số thứ tự ngày trong tuần`);
      return new Date(); // Trả về ngày hiện tại nếu không tìm thấy
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`Tìm ngày tiếp theo cho thứ '${weekday}' (số ${dayNumber}), ngày hiện tại: ${today.toISOString().split('T')[0]} (thứ ${today.getDay()})`);
    
    // Công thức tính số ngày cần cộng thêm để có được thứ trong tuần tiếp theo
    // Ví dụ: Tìm thứ 4 (3) từ ngày thứ 2 (1) => cần cộng: (3 + 7 - 1) % 7 = 2 ngày
    const daysUntilNext = (dayNumber + 7 - today.getDay()) % 7;
    
    console.log(`Cần thêm ${daysUntilNext === 0 ? 7 : daysUntilNext} ngày để đến ${weekday} tiếp theo`);
    
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + (daysUntilNext === 0 ? 7 : daysUntilNext));
    
    console.log(`Ngày ${weekday} tiếp theo là: ${nextDate.toISOString().split('T')[0]} (thứ ${nextDate.getDay()})`);
    
    return nextDate;
  };

  // Xử lý dữ liệu availability từ profile của gia sư
  useEffect(() => {
    try {
      // Kiểm tra nếu có dữ liệu về lịch trống của gia sư
      if (tutorData && tutorData.availability) {
        console.log("Đang xử lý dữ liệu lịch trống:", tutorData.availability);
        
        // Parse dữ liệu lịch trống từ JSON
        let availabilityData;
        try {
          availabilityData = typeof tutorData.availability === 'string' 
            ? JSON.parse(tutorData.availability) 
            : tutorData.availability;
          
          console.log("Dữ liệu lịch trống sau khi parse:", JSON.stringify(availabilityData, null, 2));
        } catch (error) {
          console.error("Lỗi khi parse dữ liệu lịch trống:", error);
          const emptyState: AvailabilityState = {};
          emptyState._timeRanges = {};
          emptyState._specificDates = {};
          emptyState._hasSpecificDates = false;
          emptyState._empty = true;
          setAvailableTimeSlots(emptyState);
          return;
        }
        
        if (!availabilityData || !Array.isArray(availabilityData) || availabilityData.length === 0) {
          console.log("Dữ liệu lịch trống không hợp lệ hoặc rỗng");
          const emptyState: AvailabilityState = {};
          emptyState._timeRanges = {};
          emptyState._specificDates = {};
          emptyState._hasSpecificDates = false;
          emptyState._empty = true;
          setAvailableTimeSlots(emptyState);
          return;
        }

        // Reset form values để đảm bảo không có giá trị mặc định
        form.setValue("start_time", "");
        form.setValue("end_time", "");
        
        // Chuẩn bị cấu trúc dữ liệu
        // - daySlots: lưu trữ thời gian có thể đặt lịch theo định dạng YYYY-MM-DD cho mỗi ngày
        // - timeRanges: lưu trữ các khoảng thời gian đầy đủ (start+end) cho mỗi ngày
        // - specificDates: đánh dấu các ngày cụ thể đã có trong lịch
        const daySlots: {[key: string]: string[]} = {};
        const timeRanges: {[key: string]: Array<{startTime: string, endTime: string}>} = {};
        const specificDates: {[key: string]: boolean} = {};
        
        // Ngày hiện tại (đặt về 00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Xử lý từng mục trong dữ liệu lịch trống
        availabilityData.forEach((slot: any) => {
          console.log("Đang xử lý slot:", slot);
          
          // Kiểm tra nếu là loại "specific" (ngày cụ thể)
          if (slot.type === "specific" && slot.date && slot.startTime && slot.endTime) {
            // Xử lý lịch theo ngày cụ thể
            console.log("Xử lý lịch ngày cụ thể:", slot.date);
            
            // Chuyển đổi chuỗi ngày thành đối tượng Date
            const specificDate = new Date(slot.date);
            
            // Kiểm tra ngày hợp lệ và không trong quá khứ
            if (!isNaN(specificDate.getTime()) && specificDate >= today) {
              // Lấy và kiểm tra thời gian
              const [startHour, startMin] = slot.startTime.split(':').map(Number);
              const [endHour, endMin] = slot.endTime.split(':').map(Number);
              
              if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
                console.warn("Định dạng thời gian không hợp lệ:", slot);
                return;
              }
              
              // Chuyển định dạng ngày thành YYYY-MM-DD
              const dateStr = specificDate.toISOString().split('T')[0];
              
              // Thêm vào danh sách khoảng thời gian
              if (!timeRanges[dateStr]) {
                timeRanges[dateStr] = [];
              }
              timeRanges[dateStr].push({
                startTime: slot.startTime,
                endTime: slot.endTime
              });
              
              // Thêm vào danh sách thời điểm có thể bắt đầu
              if (!daySlots[dateStr]) {
                daySlots[dateStr] = [];
              }
              
              // Tạo các mốc thời gian 30 phút
              const startMinutes = startHour * 60 + startMin;
              const endMinutes = endHour * 60 + endMin;
              
              // Thêm thời gian bắt đầu chính xác
              if (startHour >= 6 && startHour < 22) {
                daySlots[dateStr].push(slot.startTime);
              }
              
              // Thêm các mốc thời gian 30 phút
              const roundedStart = Math.ceil(startMinutes / 30) * 30;
              const maxStartMinutes = endMinutes - 60; // Đảm bảo buổi học có ít nhất 60 phút
              
              for (let minute = roundedStart; minute <= maxStartMinutes; minute += 30) {
                const hour = Math.floor(minute / 60);
                const min = minute % 60;
                
                // Chỉ xem xét các thời gian từ 6h sáng đến 22h tối
                if (hour < 6 || hour >= 22) continue;
                
                const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                daySlots[dateStr].push(timeStr);
              }
              
              // Đánh dấu đây là ngày có lịch trống
              specificDates[dateStr] = true;
            }
          }
          // Kiểm tra slot có đầy đủ thông tin về thời gian cho trường hợp weekly hoặc legacy (không có type)
          else if ((slot.type === "weekly" || !slot.type) && slot.startTime && slot.endTime && slot.day) {
            // Lấy và kiểm tra thời gian
            const [startHour, startMin] = slot.startTime.split(':').map(Number);
            const [endHour, endMin] = slot.endTime.split(':').map(Number);
            
            if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
              console.warn("Định dạng thời gian không hợp lệ:", slot);
              return;
            }
            
            // Xử lý trường hợp ngày trong tuần (monday, tuesday, etc.)
            console.log("Xử lý lịch hàng tuần với ngày:", slot.day);
            const dayOfWeek = getDayOfWeekNumber(slot.day);
            console.log("Số thứ tự ngày trong tuần:", dayOfWeek, "cho ngày", slot.day);
            if (dayOfWeek === undefined) {
              console.warn(`Không nhận dạng được ngày trong tuần: ${slot.day}`);
              return;
            }
            
            // Sử dụng getNextWeekdayDate để tìm các ngày tiếp theo một cách nhất quán
            // Phù hợp với cách tutor tạo lịch trống trong dashboard
            
            console.log(`Xử lý ngày trong tuần: ${slot.day}`);
            
            // Lấy ngày đầu tiên trong tháng cho ngày trong tuần này
            const dates: Date[] = [];
            
            // Sử dụng hàm getDayOfWeekNumber từ tutor-dashboard-profile để đảm bảo tính nhất quán
            const dayNumber = (() => {
              const day = slot.day.toLowerCase().trim();
              const dayMap: { [key: string]: number } = {
                sunday: 0,
                monday: 1,
                tuesday: 2,
                wednesday: 3,
                thursday: 4,
                friday: 5,
                saturday: 6,
              };
              return dayMap[day];
            })();
            
            if (dayNumber === undefined) {
              console.error(`Không nhận dạng được ngày trong tuần: ${slot.day}`);
              return;
            }
            
            console.log(`Ngày ${slot.day} có chỉ số JavaScript: ${dayNumber}`);
            
            // Tạo các ngày tiếp theo
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Tính số ngày cần thêm để tìm được ngày đầu tiên
            const daysUntilNext = (dayNumber + 7 - today.getDay()) % 7;
            const firstDate = new Date(today);
            firstDate.setDate(today.getDate() + (daysUntilNext === 0 ? 7 : daysUntilNext));
            
            console.log(`Ngày ${slot.day} đầu tiên: ${firstDate.toISOString().split('T')[0]}, getDay(): ${firstDate.getDay()}`);
            dates.push(firstDate);
            
            // Tạo thêm 3 tuần tiếp theo
            for (let i = 1; i < 4; i++) {
              const nextDate = new Date(firstDate);
              nextDate.setDate(firstDate.getDate() + (i * 7));
              console.log(`Thêm ngày tiếp theo: ${nextDate.toISOString().split('T')[0]}, thứ = ${nextDate.getDay()}`);
              dates.push(nextDate);
            }
            
            // Xử lý mỗi ngày tìm được
            dates.forEach(date => {
              const dateStr = date.toISOString().split('T')[0];
              
              // Thêm vào danh sách khoảng thời gian
              if (!timeRanges[dateStr]) {
                timeRanges[dateStr] = [];
              }
              timeRanges[dateStr].push({
                startTime: slot.startTime,
                endTime: slot.endTime
              });
              
              // Thêm vào danh sách thời điểm có thể bắt đầu
              if (!daySlots[dateStr]) {
                daySlots[dateStr] = [];
              }
              
              // Tạo các mốc thời gian 30 phút
              const startMinutes = startHour * 60 + startMin;
              const endMinutes = endHour * 60 + endMin;
              
              // Thêm thời gian bắt đầu chính xác
              if (startHour >= 6 && startHour < 22) {
                daySlots[dateStr].push(slot.startTime);
              }
              
              // Thêm các mốc thời gian 30 phút
              const roundedStart = Math.ceil(startMinutes / 30) * 30;
              const maxStartMinutes = endMinutes - 60; // Đảm bảo buổi học có ít nhất 60 phút
              
              for (let minute = roundedStart; minute <= maxStartMinutes; minute += 30) {
                const hour = Math.floor(minute / 60);
                const min = minute % 60;
                
                // Chỉ xem xét các thời gian từ 6h sáng đến 22h tối
                if (hour < 6 || hour >= 22) continue;
                
                const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                daySlots[dateStr].push(timeStr);
              }
              
              // Đánh dấu đây là ngày có lịch trống
              specificDates[dateStr] = true;
            });
          } else {
            console.warn("Slot không có đủ thông tin cần thiết:", slot);
          }
        });
        
        // Loại bỏ trùng lặp và sắp xếp các thời điểm cho mỗi ngày
        for (const dateStr in daySlots) {
          daySlots[dateStr] = Array.from(new Set(daySlots[dateStr])).sort();
        }
        
        console.log("Các ngày và khung giờ đã xử lý:", daySlots);
        console.log("Các khoảng thời gian đầy đủ:", timeRanges);
        console.log("Các ngày có lịch:", Object.keys(specificDates));
        
        // Lưu thông tin khoảng thời gian để sử dụng khi tính toán
        setAvailableTimeSlots({
          ...daySlots,
          _timeRanges: timeRanges,
          _specificDates: specificDates,
          _hasSpecificDates: true,
          _empty: Object.keys(daySlots).length === 0
        });
      } else {
        // Nếu không có dữ liệu lịch trống
        console.log("Không có dữ liệu lịch trống cho gia sư này.");
        const emptyState: AvailabilityState = {};
        emptyState._timeRanges = {};
        emptyState._specificDates = {};
        emptyState._hasSpecificDates = false;
        emptyState._empty = true;
        setAvailableTimeSlots(emptyState);
      }
    } catch (error) {
      console.error("Lỗi khi xử lý dữ liệu lịch trống:", error);
      // Đảm bảo luôn có giá trị mặc định
      const emptyState: AvailabilityState = {};
      emptyState._timeRanges = {};
      emptyState._specificDates = {};
      emptyState._hasSpecificDates = false;
      emptyState._empty = true;
      setAvailableTimeSlots(emptyState);
    }
  }, [tutorData]);
  

  
  // Lấy danh sách các ngày có lịch trống
  const getAvailableDays = () => {
    const result: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Thiết lập về 00:00:00

    try {
      // Kiểm tra nếu không có dữ liệu lịch trống hoặc đã đánh dấu là rỗng
      // @ts-ignore - Truy cập thuộc tính động
      if (availableTimeSlots._empty) {
        console.log("Không có ngày nào có lịch trống");
        return result;
      }

      // Lặp qua tất cả các ngày có lịch trống
      for (const dateStr in availableTimeSlots) {
        // Bỏ qua các thuộc tính metadata (bắt đầu bằng dấu gạch dưới)
        if (dateStr.startsWith('_')) continue;

        // Chuyển đổi chuỗi ngày thành đối tượng Date
        const date = new Date(dateStr);
        
        // Kiểm tra ngày hợp lệ và không trong quá khứ
        if (!isNaN(date.getTime()) && date >= today) {
          // Kiểm tra nếu có các time slots cho ngày này
          if (Array.isArray(availableTimeSlots[dateStr]) && availableTimeSlots[dateStr].length > 0) {
            result.push(date);
          }
        }
      }

      // Log kết quả danh sách ngày
      if (result.length > 0) {
        console.log("Các ngày có lịch trống:", result.map(d => d.toISOString().split('T')[0]));
      } else {
        console.log("Không tìm thấy ngày nào có lịch trống sau khi xử lý");
      }

      // Sắp xếp theo thứ tự ngày tăng dần
      return result.sort((a, b) => a.getTime() - b.getTime());
    } catch (error) {
      console.error("Lỗi khi lấy danh sách ngày có lịch trống:", error);
      return [];
    }
  };
  
  // Hiển thị thời gian trống cho ngày đã chọn
  const getAvailableTimesForSelectedDate = () => {
    if (!form.watch("date")) {
      return [];
    }
    
    try {
      // Kiểm tra nếu không có dữ liệu lịch trống hoặc đánh dấu là rỗng
      // @ts-ignore - Truy cập thuộc tính động
      if (availableTimeSlots._empty) {
        console.log("Không có thời gian khả dụng cho ngày này");
        return []; 
      }
      
      const selectedDate = form.watch("date");
      
      // Format ngày thành chuỗi YYYY-MM-DD để tìm trong object
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Lấy danh sách thời gian có sẵn cho ngày này
      const timesForDate = availableTimeSlots[dateStr];
      
      if (Array.isArray(timesForDate) && timesForDate.length > 0) {
        return timesForDate;
      } else {
        console.log(`Không tìm thấy thời gian khả dụng cho ngày ${dateStr}`);
        return [];
      }
    } catch (error) {
      console.error("Lỗi khi lấy thời gian khả dụng:", error);
      return [];
    }
  };
  
  // Cập nhật giờ kết thúc tự động dựa trên giờ bắt đầu
  const updateEndTimeBasedOnStartTime = (startTime: string) => {
    if (!startTime || !form.watch("date")) {
      return;
    }
    
    try {
      // Kiểm tra dữ liệu có hợp lệ không
      // @ts-ignore - Truy cập thuộc tính động
      if (availableTimeSlots._empty) {
        console.log("Không có dữ liệu lịch trống");
        return;
      }
      
      // Lấy ngày đã chọn và chuyển về định dạng YYYY-MM-DD
      const selectedDate = form.watch("date");
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Lấy danh sách các khoảng thời gian cho ngày đã chọn
      // @ts-ignore - Truy cập thuộc tính động
      const timeRanges = availableTimeSlots._timeRanges?.[dateStr] || [];
      
      if (timeRanges.length === 0) {
        console.log(`Không tìm thấy khoảng thời gian nào cho ngày ${dateStr}`);
        return;
      }
      
      // Chuyển đổi giờ bắt đầu thành phút
      const [startHour, startMin] = startTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      
      // Tìm khoảng thời gian phù hợp chứa thời gian bắt đầu
      const matchedRange = timeRanges.find(range => {
        const [rangeStartHour, rangeStartMin] = range.startTime.split(':').map(Number);
        const [rangeEndHour, rangeEndMin] = range.endTime.split(':').map(Number);
        
        const rangeStartMinutes = rangeStartHour * 60 + rangeStartMin;
        const rangeEndMinutes = rangeEndHour * 60 + rangeEndMin;
        
        // Thời gian bắt đầu phải nằm trong khoảng thời gian
        return startMinutes >= rangeStartMinutes && startMinutes < rangeEndMinutes;
      });
      
      if (matchedRange) {
        // Nếu tìm thấy khoảng thời gian phù hợp
        const [endHour, endMin] = matchedRange.endTime.split(':').map(Number);
        const endMinutes = endHour * 60 + endMin;
        
        // Tính thời gian kết thúc:
        // 1. Lý tưởng: 60 phút sau thời gian bắt đầu
        // 2. Không vượt quá thời gian kết thúc của khoảng thời gian
        const idealEndMinutes = startMinutes + 60;
        const actualEndMinutes = Math.min(idealEndMinutes, endMinutes);
        
        // Định dạng thời gian kết thúc
        const finalEndHour = Math.floor(actualEndMinutes / 60);
        const finalEndMin = actualEndMinutes % 60;
        const endTime = `${finalEndHour.toString().padStart(2, '0')}:${finalEndMin.toString().padStart(2, '0')}`;
        
        // Cập nhật form
        form.setValue("end_time", endTime);
        
        console.log(`Đã cập nhật giờ kết thúc: ${endTime} (dựa trên khoảng ${matchedRange.startTime}-${matchedRange.endTime})`);
      } else {
        // Nếu không tìm thấy khoảng thời gian phù hợp
        console.log(`Không tìm được khoảng thời gian chứa ${startTime}`);
        
        // Đặt thời gian kết thúc là 60 phút sau (hoặc tối đa 22:00)
        const idealEndMinutes = startMinutes + 60;
        const maxEndMinutes = 22 * 60;
        const actualEndMinutes = Math.min(idealEndMinutes, maxEndMinutes);
        
        const endHour = Math.floor(actualEndMinutes / 60);
        const endMin = actualEndMinutes % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        
        form.setValue("end_time", endTime);
        console.log(`Đặt giờ kết thúc mặc định: ${endTime} (60 phút sau giờ bắt đầu)`);
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật giờ kết thúc:", error);
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
                  {/* Hiển thị thông báo khi gia sư chưa thiết lập lịch trống */}
                  {availableTimeSlots._empty && (
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
                            {tutorData?.availability && JSON.parse(tutorData.availability).some((slot: any) => slot.day === "tuesday") ? 
                              "(Chỉ hiển thị những ngày Thứ Ba mà gia sư có lịch trống)" :
                              "(Chỉ hiển thị những ngày mà gia sư có lịch trống)"
                            }
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
                                getAvailableTimesForSelectedDate().map((time: string) => (
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