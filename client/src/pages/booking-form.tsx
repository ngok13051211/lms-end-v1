import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  CalendarIcon,
  Clock,
  MapPin,
  MessageSquare,
  MonitorSmartphone,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// Mock data - to be replaced with React Query later
const mockTutor = {
  id: "t1",
  name: "Nguyễn Văn A",
  avatar: "https://i.pravatar.cc/150?img=1",
  rating: 4.9,
  totalReviews: 143,
  experience: "5 năm",
  education: "Thạc sĩ Toán học, Đại học Quốc gia Hà Nội",
};

const mockCourse = {
  id: "c1",
  name: "Luyện thi THPT Quốc gia môn Toán",
  subject: "Toán",
  educationLevel: "THPT",
  description:
    "Khóa học cung cấp kiến thức, kỹ năng và phương pháp giải nhanh trong kỳ thi THPT Quốc gia.",
  duration: "90 phút/buổi",
  price: 250000, // VND per session
  deliveryMode: "both", // "online", "offline" hoặc "both"
};

// Mock available time slots - to be replaced with React Query later
const mockTimeSlots = [
  {
    date: new Date(2025, 4, 15),
    slots: [
      { startTime: "08:00", endTime: "10:00" },
      { startTime: "10:30", endTime: "12:00" },
      { startTime: "15:00", endTime: "17:00" },
    ],
  },
  {
    date: new Date(2025, 4, 16),
    slots: [
      { startTime: "09:00", endTime: "10:30" },
      { startTime: "14:00", endTime: "16:00" },
    ],
  },
  {
    date: new Date(2025, 4, 17),
    slots: [
      { startTime: "08:00", endTime: "09:30" },
      { startTime: "13:00", endTime: "14:30" },
      { startTime: "15:00", endTime: "16:30" },
      { startTime: "17:00", endTime: "18:30" },
    ],
  },
  {
    date: new Date(2025, 4, 19),
    slots: [
      { startTime: "10:00", endTime: "12:00" },
      { startTime: "15:00", endTime: "17:00" },
    ],
  },
  {
    date: new Date(2025, 4, 20),
    slots: [
      { startTime: "09:00", endTime: "11:00" },
      { startTime: "11:30", endTime: "13:30" },
      { startTime: "14:00", endTime: "16:00" },
    ],
  },
];

// Định nghĩa kiểu dữ liệu cho khung giờ
type TimeSlot = {
  startTime: string;
  endTime: string;
};

// Custom type để lưu trữ thông tin về các buổi học đã chọn
type SelectedSessionInfo = {
  date: Date;
  timeSlots: TimeSlot[];
};

// Định nghĩa kiểu booking để trả về API
type BookingInfo = {
  date: string; // "2025-05-16"
  startTime: string; // "08:00"
  endTime: string; // "10:00"
};

// Form schema
const bookingFormSchema = z.object({
  bookings: z
    .array(
      z.object({
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      })
    )
    .min(1, { message: "Vui lòng chọn ít nhất một buổi học" }),
  mode: z.enum(["online", "offline"], {
    required_error: "Vui lòng chọn hình thức học",
  }),
  location: z.string().optional(),
  message: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export default function BookingForm() {
  const [, params] = useRoute("/book/:tutorId");
  const queryClient = useQueryClient();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<
    SelectedSessionInfo[]
  >([]);
  const [currentViewingDate, setCurrentViewingDate] = useState<
    Date | undefined
  >(undefined);
  const [availableTimeSlotsMap, setAvailableTimeSlotsMap] = useState<
    Record<string, TimeSlot[]>
  >({});

  const tutorId = params?.tutorId;
  const courseId = new URLSearchParams(window.location.search).get("course");
  const { toast } = useToast();

  // React Query hooks would go here later
  // const { data: tutor } = useTutor(tutorId);
  // const { data: course } = useCourse(courseId);
  // const { data: availability } = useTutorAvailability(tutorId);

  // For now, using mock data
  const tutor = mockTutor;
  const course = mockCourse;

  // Setup form
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      bookings: [],
      mode:
        course.deliveryMode === "online"
          ? "online"
          : course.deliveryMode === "offline"
          ? "offline"
          : undefined,
      message: "",
    },
  });

  const watchMode = form.watch("mode");

  // Khởi tạo availableTimeSlots khi component mount
  useEffect(() => {
    const slotsMap: Record<string, TimeSlot[]> = {};
    mockTimeSlots.forEach((item) => {
      const dateKey = format(item.date, "yyyy-MM-dd");
      slotsMap[dateKey] = item.slots;
    });
    setAvailableTimeSlotsMap(slotsMap);
  }, []);

  // Chuyển đổi selectedSessions sang định dạng bookings cho form
  useEffect(() => {
    const bookings: BookingInfo[] = selectedSessions.flatMap((session) => {
      const dateStr = format(session.date, "yyyy-MM-dd");
      return session.timeSlots.map((timeSlot) => ({
        date: dateStr,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
      }));
    });

    form.setValue("bookings", bookings, {
      shouldValidate: true,
    });
  }, [selectedSessions, form]);

  // Handle date selection in calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const dateStr = format(date, "yyyy-MM-dd");
    const dateExists = selectedDates.some(
      (d) => format(d, "yyyy-MM-dd") === dateStr
    );

    let newSelectedDates: Date[];
    if (dateExists) {
      // Xóa ngày nếu đã được chọn
      newSelectedDates = selectedDates.filter(
        (d) => format(d, "yyyy-MM-dd") !== dateStr
      );
      // Xóa session tương ứng
      setSelectedSessions((prev) =>
        prev.filter((session) => format(session.date, "yyyy-MM-dd") !== dateStr)
      );
    } else {
      // Thêm ngày mới
      newSelectedDates = [...selectedDates, date];
    }

    setSelectedDates(newSelectedDates);
    setCurrentViewingDate(date);
  };

  // Lấy slot khả dụng cho ngày đang xem
  const getAvailableTimeSlotsForCurrentDate = () => {
    if (!currentViewingDate) return [];
    const dateKey = format(currentViewingDate, "yyyy-MM-dd");
    return availableTimeSlotsMap[dateKey] || [];
  };

  // Xử lý chọn khung giờ cho một ngày cụ thể
  const handleTimeSlotSelect = (date: Date, timeSlot: TimeSlot) => {
    const dateStr = format(date, "yyyy-MM-dd");

    // Kiểm tra xem ngày đã được chọn chưa
    const sessionIndex = selectedSessions.findIndex(
      (session) => format(session.date, "yyyy-MM-dd") === dateStr
    );

    let newSessions = [...selectedSessions];

    if (sessionIndex > -1) {
      // Nếu ngày đã có trong danh sách, toggle slot
      const existingTimeSlots = [...newSessions[sessionIndex].timeSlots];

      // Kiểm tra xem khung giờ đã được chọn chưa
      const timeSlotIndex = existingTimeSlots.findIndex(
        (slot) =>
          slot.startTime === timeSlot.startTime &&
          slot.endTime === timeSlot.endTime
      );

      if (timeSlotIndex > -1) {
        // Nếu đã chọn rồi thì bỏ chọn
        existingTimeSlots.splice(timeSlotIndex, 1);
      } else {
        // Nếu chưa chọn thì thêm vào
        existingTimeSlots.push(timeSlot);
      }

      // Cập nhật lại session
      newSessions[sessionIndex] = {
        ...newSessions[sessionIndex],
        timeSlots: existingTimeSlots,
      };

      // Xóa session nếu không còn time slot nào
      if (existingTimeSlots.length === 0) {
        newSessions.splice(sessionIndex, 1);
        // Cũng xóa ngày khỏi selectedDates
        setSelectedDates(
          selectedDates.filter((d) => format(d, "yyyy-MM-dd") !== dateStr)
        );
      }
    } else {
      // Thêm mới nếu chưa có
      newSessions.push({
        date,
        timeSlots: [timeSlot],
      });
    }

    setSelectedSessions(newSessions);
  };

  // Kiểm tra slot đã được chọn cho một ngày cụ thể chưa
  const isTimeSlotSelected = (date: Date, timeSlot: TimeSlot) => {
    const dateStr = format(date, "yyyy-MM-dd");

    const session = selectedSessions.find(
      (session) => format(session.date, "yyyy-MM-dd") === dateStr
    );

    if (!session) return false;

    return session.timeSlots.some(
      (slot) =>
        slot.startTime === timeSlot.startTime &&
        slot.endTime === timeSlot.endTime
    );
  };

  // Check if a date has available slots
  const hasTimeSlots = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return (
      availableTimeSlotsMap[dateStr] &&
      availableTimeSlotsMap[dateStr].length > 0
    );
  };

  // Lấy slot khả dụng cho một ngày cụ thể
  const getAvailableSlotsForDate = (date: Date): TimeSlot[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availableTimeSlotsMap[dateStr] || [];
  };

  // Lấy các khung giờ đã được chọn cho ngày cụ thể
  const getSelectedTimeSlotsForDate = (date: Date): TimeSlot[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    const session = selectedSessions.find(
      (s) => format(s.date, "yyyy-MM-dd") === dateStr
    );
    return session?.timeSlots || [];
  };

  // Xóa một phiên học đã chọn
  const removeSession = (dateStr: string) => {
    setSelectedSessions((prev) =>
      prev.filter((session) => format(session.date, "yyyy-MM-dd") !== dateStr)
    );

    setSelectedDates((prev) =>
      prev.filter((date) => format(date, "yyyy-MM-dd") !== dateStr)
    );
  };

  // Form submission with custom validation
  const onSubmit = async (data: BookingFormValues) => {
    // Custom validation for location when mode is offline
    if (
      data.mode === "offline" &&
      (!data.location || data.location.trim() === "")
    ) {
      form.setError("location", {
        type: "manual",
        message: "Vui lòng nhập địa điểm học khi chọn hình thức học trực tiếp",
      });
      return;
    }

    // If all validations pass, proceed with form submission
    console.log("Form data:", data);
    console.log("Selected bookings:", data.bookings);

    try {
      // Here you would submit data to your API
      // const response = await api.post("/bookings", data);

      // Show success toast
      toast({
        title: "Đặt lịch thành công",
        description:
          "Yêu cầu của bạn đã được gửi tới gia sư. Vui lòng chờ xác nhận.",
      });

      // Redirect to dashboard or other page
      // navigate("/student-dashboard");
    } catch (error) {
      // Show error toast
      toast({
        title: "Đặt lịch thất bại",
        description: "Có lỗi xảy ra khi đặt lịch. Vui lòng thử lại sau.",
        variant: "destructive",
      });
      console.error("Booking error:", error);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <h1 className="text-3xl font-bold mb-2">Đặt lịch học</h1>
        <p className="text-muted-foreground mb-8">
          Đặt lịch học với gia sư và khóa học của bạn chọn
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main booking form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin buổi học</CardTitle>
                <CardDescription>
                  Chọn thời gian và hình thức học phù hợp với bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    {/* Date selection */}
                    <FormField
                      control={form.control}
                      name="bookings"
                      render={() => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Chọn ngày học</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    selectedDates.length === 0 &&
                                      "text-muted-foreground"
                                  )}
                                >
                                  {selectedDates.length > 0 ? (
                                    <span>
                                      Đã chọn {selectedDates.length} ngày học
                                    </span>
                                  ) : (
                                    <span>Chọn ngày học</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="multiple"
                                selected={selectedDates}
                                onSelect={(dates) => {
                                  if (!Array.isArray(dates)) return;
                                  setSelectedDates(dates);
                                }}
                                onDayClick={handleDateSelect}
                                locale={vi}
                                modifiers={{
                                  available: hasTimeSlots,
                                  selected: (date) =>
                                    selectedDates.some(
                                      (d) =>
                                        format(d, "yyyy-MM-dd") ===
                                        format(date, "yyyy-MM-dd")
                                    ),
                                }}
                                modifiersStyles={{
                                  available: {
                                    fontWeight: "bold",
                                    backgroundColor:
                                      "hsl(var(--primary) / 0.1)",
                                    color: "hsl(var(--primary))",
                                  },
                                  selected: {
                                    backgroundColor: "hsl(var(--primary))",
                                    color: "hsl(var(--primary-foreground))",
                                  },
                                }}
                                disabled={(date) => {
                                  // Disable dates in the past
                                  const now = new Date();
                                  now.setHours(0, 0, 0, 0);
                                  return date < now || !hasTimeSlots(date);
                                }}
                                fromDate={new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Chọn một hoặc nhiều ngày có lịch trống (hiển thị màu
                            xanh nhạt)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Selected sessions display */}
                    {selectedDates.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">
                          Lịch học đã chọn
                        </h3>
                        <div className="space-y-3">
                          {selectedDates.map((date) => {
                            const dateStr = format(date, "yyyy-MM-dd");
                            const dateFormatted = format(
                              date,
                              "EEEE, dd/MM/yyyy",
                              {
                                locale: vi,
                              }
                            );

                            const selectedTimeSlots =
                              getSelectedTimeSlotsForDate(date);
                            const availableSlots =
                              getAvailableSlotsForDate(date);

                            return (
                              <div
                                key={dateStr}
                                className="border rounded-md p-4 space-y-3"
                              >
                                <div className="flex justify-between items-center">
                                  <h4 className="font-medium text-sm">
                                    {dateFormatted}
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeSession(dateStr)}
                                  >
                                    <span className="sr-only">Xóa ngày</span>
                                    &times;
                                  </Button>
                                </div>
                                <div>
                                  <FormLabel className="text-xs">
                                    Chọn khung giờ học (có thể chọn nhiều)
                                  </FormLabel>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-1.5">
                                    {availableSlots.map((slot) => {
                                      const isSelected = selectedTimeSlots.some(
                                        (selectedSlot) =>
                                          selectedSlot.startTime ===
                                            slot.startTime &&
                                          selectedSlot.endTime === slot.endTime
                                      );

                                      return (
                                        <Button
                                          key={`${dateStr}-${slot.startTime}-${slot.endTime}`}
                                          type="button"
                                          size="sm"
                                          variant={
                                            isSelected ? "default" : "outline"
                                          }
                                          className={cn(
                                            "flex items-center justify-center gap-1.5 text-xs py-5",
                                            isSelected
                                              ? "bg-primary text-primary-foreground"
                                              : "hover:bg-primary/10"
                                          )}
                                          onClick={() =>
                                            handleTimeSlotSelect(date, slot)
                                          }
                                        >
                                          <Clock className="w-3 h-3 mr-1" />
                                          <span className="whitespace-nowrap">
                                            {slot.startTime} - {slot.endTime}
                                          </span>
                                        </Button>
                                      );
                                    })}
                                  </div>
                                  {availableSlots.length === 0 && (
                                    <p className="text-muted-foreground text-xs mt-1">
                                      Không có khung giờ trống cho ngày đã chọn
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-sm",
                              selectedSessions.length !== selectedDates.length
                                ? "text-destructive"
                                : "text-muted-foreground"
                            )}
                          >
                            {selectedSessions.length === selectedDates.length
                              ? `Đã chọn ${selectedSessions.reduce(
                                  (total, session) =>
                                    total + session.timeSlots.length,
                                  0
                                )} khung giờ học cho ${
                                  selectedDates.length
                                } ngày`
                              : `Vui lòng chọn khung giờ học cho tất cả các ngày (còn thiếu ${
                                  selectedDates.length - selectedSessions.length
                                } ngày)`}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedDates.length === 0 && (
                      <div className="rounded-md bg-muted/50 border border-border/50 p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          Vui lòng chọn ít nhất một ngày học từ lịch
                        </p>
                      </div>
                    )}

                    {/* Learning mode */}
                    {course.deliveryMode && (
                      <FormField
                        control={form.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Hình thức học</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex flex-col sm:flex-row gap-3"
                              >
                                {(course.deliveryMode === "online" ||
                                  course.deliveryMode === "both") && (
                                  <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-secondary/50 transition-colors">
                                    <RadioGroupItem
                                      value="online"
                                      id="online"
                                    />
                                    <div className="grid gap-1.5">
                                      <label
                                        htmlFor="online"
                                        className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1.5"
                                      >
                                        <MonitorSmartphone className="w-4 h-4" />
                                        Học trực tuyến
                                      </label>
                                      <div className="text-[13px] text-muted-foreground">
                                        Thông qua Google Meet hoặc Zoom
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {(course.deliveryMode === "offline" ||
                                  course.deliveryMode === "both") && (
                                  <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-secondary/50 transition-colors">
                                    <RadioGroupItem
                                      value="offline"
                                      id="offline"
                                    />
                                    <div className="grid gap-1.5">
                                      <label
                                        htmlFor="offline"
                                        className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1.5"
                                      >
                                        <MapPin className="w-4 h-4" />
                                        Học trực tiếp
                                      </label>
                                      <div className="text-[13px] text-muted-foreground">
                                        Tại địa điểm thỏa thuận với gia sư
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Location input for offline mode */}
                    {watchMode === "offline" && (
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Địa điểm học trực tiếp</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                  placeholder="Nhập địa chỉ học tập (ví dụ: quán cà phê, thư viện...)"
                                  className="pl-10 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Địa điểm sẽ được thông báo cho gia sư trước buổi
                              học
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Optional message */}
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lời nhắn (không bắt buộc)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Nhập lời nhắn cho gia sư (nhu cầu học tập, mong muốn...)"
                              className="resize-none min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Gia sư sẽ nhận được thông tin này trước buổi học
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex-col sm:flex-row gap-4 pt-6 border-t">
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
                  disabled={
                    !form.formState.isValid || form.formState.isSubmitting
                  }
                >
                  Xác nhận đặt lịch
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar with course and tutor info */}
          <div>
            {/* Course information card */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Thông tin khóa học</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-base md:text-lg mb-1">
                      {course.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline" className="bg-primary/5">
                        {course.subject}
                      </Badge>
                      <Badge variant="outline" className="bg-primary/5">
                        {course.educationLevel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {course.description}
                    </p>
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
                        }).format(course.price)}
                        /buổi
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Hình thức:</span>
                      <span className="flex items-center gap-2">
                        {(course.deliveryMode === "online" ||
                          course.deliveryMode === "both") && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            Online
                          </span>
                        )}
                        {(course.deliveryMode === "offline" ||
                          course.deliveryMode === "both") && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                            Offline
                          </span>
                        )}
                      </span>
                    </div>
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
                    <AvatarImage src={tutor.avatar} alt={tutor.name} />
                    <AvatarFallback>
                      {tutor.name.split(" ").pop()?.charAt(0) ||
                        tutor.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-base">{tutor.name}</h3>
                    <div className="flex items-center gap-1 my-1">
                      <span className="text-sm font-medium text-amber-500">
                        {tutor.rating}
                      </span>
                      <span className="text-amber-500 flex">
                        {"★".repeat(Math.round(tutor.rating))}
                        {"☆".repeat(5 - Math.round(tutor.rating))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({tutor.totalReviews} đánh giá)
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tutor.experience} kinh nghiệm giảng dạy
                    </p>
                  </div>
                </div>
                <p className="text-sm">{tutor.education}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
