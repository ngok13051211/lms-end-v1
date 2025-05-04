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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
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
    if (tutorData && tutorData.availability) {
      try {
        // Nếu availability đã là JSON object thì không cần parse
        const availabilityData = typeof tutorData.availability === 'string' 
          ? JSON.parse(tutorData.availability) 
          : tutorData.availability;
        
        console.log("Dữ liệu lịch trống nhận được:", JSON.stringify(availabilityData));
          
        // Tạo object mới để lưu trữ thời gian trống theo ngày trong tuần
        const slots: {[key: string]: string[]} = {};
        
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
        
        // Xóa trùng lặp và hợp nhất các khung giờ cho mỗi ngày
        // Sắp xếp lịch trống theo ngày và thời gian bắt đầu
        const mergedSlots: {[key: string]: Array<{start: number, end: number}>} = {};
        
        // Bước 1: Nhóm lịch theo ngày và chuyển thành số phút
        availabilityData.forEach((slot: any) => {
          const dayNumber = dayMap[slot.day.toLowerCase()];
          if (!dayNumber) return;
          
          // Chuyển startTime và endTime sang số phút để dễ tính toán
          const [startHour, startMin] = slot.startTime.split(':').map(Number);
          const [endHour, endMin] = slot.endTime.split(':').map(Number);
          
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          // Kiểm tra thời gian hợp lệ
          if (startMinutes >= endMinutes) return;
          
          if (!mergedSlots[dayNumber]) {
            mergedSlots[dayNumber] = [];
          }
          
          mergedSlots[dayNumber].push({ start: startMinutes, end: endMinutes });
        });
        
        // Bước 2: Sắp xếp và hợp nhất các khoảng thời gian chồng lấp cho mỗi ngày
        for (const dayNumber in mergedSlots) {
          // Sắp xếp theo thời gian bắt đầu
          mergedSlots[dayNumber].sort((a, b) => a.start - b.start);
          
          const mergedRanges: Array<{start: number, end: number}> = [];
          
          for (const range of mergedSlots[dayNumber]) {
            if (mergedRanges.length === 0) {
              mergedRanges.push(range);
              continue;
            }
            
            const lastRange = mergedRanges[mergedRanges.length - 1];
            
            // Kiểm tra nếu có sự chồng chéo
            if (range.start <= lastRange.end) {
              // Hợp nhất khoảng thời gian
              lastRange.end = Math.max(lastRange.end, range.end);
            } else {
              // Thêm khoảng thời gian mới
              mergedRanges.push(range);
            }
          }
          
          // Bước 3: Chuyển các khoảng đã hợp nhất thành các time slot 30 phút
          const timeSlots: string[] = [];
          
          mergedRanges.forEach(({ start, end }) => {
            // Làm tròn thời gian bắt đầu lên 30 phút
            const roundedStart = Math.ceil(start / 30) * 30;
            
            // Tạo các time slot từ start đến end, mỗi 30 phút
            for (let minute = roundedStart; minute < end; minute += 30) {
              const hour = Math.floor(minute / 60);
              const min = minute % 60;
              
              // Bỏ qua nếu giờ nằm ngoài phạm vi 6h sáng đến 22h tối
              if (hour < 6 || hour >= 22) continue;
              
              const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
              timeSlots.push(timeStr);
            }
          });
          
          // Loại bỏ trùng lặp và sắp xếp
          const uniqueTimeSlots = Array.from(new Set(timeSlots));
          slots[dayNumber] = uniqueTimeSlots.sort();
        }
        
        console.log("Slots đã xử lý:", slots);
        
        // Cập nhật state
        setAvailableTimeSlots(slots);
      } catch (error) {
        console.error("Lỗi khi xử lý dữ liệu lịch trống:", error);
      }
    }
  }, [tutorData]);
  
  // Lấy các ngày trong tuần có lịch trống (4 tuần tới)
  const getAvailableDays = () => {
    // Tạo mảng các ngày có lịch trống trong 4 tuần tới
    const result: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Bắt đầu từ thời điểm 00:00:00 của ngày hôm nay
    
    // 28 ngày (4 tuần)
    for (let i = 0; i < 28; i++) {
      const date = addDays(today, i);
      const dayOfWeek = date.getDay().toString();
      
      // Chỉ thêm ngày có slot trống
      if (availableTimeSlots[dayOfWeek] && availableTimeSlots[dayOfWeek].length > 0) {
        result.push(date);
      }
    }
    
    return result;
  };
  
  // Hiển thị thời gian trống cho ngày đã chọn
  const getAvailableTimesForSelectedDate = () => {
    if (!form.watch("date")) return [];
    const dayOfWeek = form.watch("date").getDay().toString();
    return availableTimeSlots[dayOfWeek] || [];
  };
  
  // Cập nhật khoảng thời gian khi người dùng chọn giờ bắt đầu
  const updateEndTimeBasedOnStartTime = (startTime: string) => {
    const availableTimes = getAvailableTimesForSelectedDate();
    const startIndex = availableTimes.indexOf(startTime);
    
    if (startIndex >= 0) {
      // Chọn slot 30 phút làm mặc định
      let endTime = "";
      
      // Kiểm tra xem có slot tiếp theo không
      if (startIndex + 1 < availableTimes.length) {
        // Nếu có, kiểm tra xem có liên tục không
        const [startHour, startMin] = startTime.split(':').map(Number);
        const nextTime = availableTimes[startIndex + 1];
        const [nextHour, nextMin] = nextTime.split(':').map(Number);
        
        const startMinutes = startHour * 60 + startMin;
        const nextMinutes = nextHour * 60 + nextMin;
        
        // Nếu thời gian tiếp theo sau 30 phút, nó là liên tục
        if (nextMinutes - startMinutes === 30) {
          // Tìm chuỗi các slots liên tục
          let lastIndex = startIndex;
          
          for (let i = startIndex + 1; i < availableTimes.length; i++) {
            const [currHour, currMin] = availableTimes[i].split(':').map(Number);
            const prevTime = availableTimes[i - 1];
            const [prevHour, prevMin] = prevTime.split(':').map(Number);
            
            const currMinutes = currHour * 60 + currMin;
            const prevMinutes = prevHour * 60 + prevMin;
            
            if (currMinutes - prevMinutes === 30) {
              lastIndex = i;
            } else {
              break;
            }
          }
          
          // Đặt thời gian kết thúc sau 60 phút nếu có đủ slot liên tục
          if (lastIndex >= startIndex + 1) {
            const [hour, min] = availableTimes[startIndex + 1].split(':').map(Number);
            const endMinutes = hour * 60 + min + 30;
            const endHour = Math.floor(endMinutes / 60);
            const endMin = endMinutes % 60;
            endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
          }
        }
      }
      
      // Nếu không tìm được slot liên tục, tạo thời gian kết thúc 60 phút sau giờ bắt đầu
      if (!endTime) {
        const [hour, min] = startTime.split(':').map(Number);
        const endMinutes = hour * 60 + min + 60;
        const endHour = Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;
        endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      }
      
      form.setValue("end_time", endTime);
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
                                available: "bg-primary/10"
                              }}
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
                          {getAvailableTimesForSelectedDate().length > 0 ? (
                            <div className="text-xs mb-2 text-muted-foreground">
                              (Chỉ hiển thị giờ trong khung thời gian gia sư có lịch trống)
                            </div>
                          ) : (
                            <div className="text-xs mb-2 text-amber-600">
                              Vui lòng chọn ngày và giờ bắt đầu trước
                            </div>
                          )}
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                            disabled={getAvailableTimesForSelectedDate().length === 0 || !form.watch("start_time")}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn giờ kết thúc" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getAvailableTimesForSelectedDate().length > 0 && form.watch("start_time") ? (
                                getAvailableTimesForSelectedDate()
                                  .filter((time) => time > form.watch("start_time"))
                                  .length > 0 ? (
                                    getAvailableTimesForSelectedDate()
                                      .filter((time) => time > form.watch("start_time"))
                                      .map((time) => (
                                        <SelectItem key={time} value={time}>
                                          {time}
                                        </SelectItem>
                                      ))
                                  ) : (
                                    <div className="px-2 py-1 text-sm text-muted-foreground">
                                      Không có khung giờ kết thúc phù hợp
                                    </div>
                                  )
                              ) : (
                                <div className="px-2 py-1 text-sm text-muted-foreground">
                                  Vui lòng chọn ngày và giờ bắt đầu trước
                                </div>
                              )}
                            </SelectContent>
                          </Select>
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