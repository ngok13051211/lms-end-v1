import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import {
  CalendarIcon,
  Clock,
  MapPin,
  MessageSquare,
  MonitorSmartphone,
  Loader2,
  AlertCircle,
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

// API types
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

interface EducationLevel {
  id: number;
  name: string;
  level?: string;
}

interface Course {
  id: string;
  title: string;
  subject: Subject | string;
  educationLevel: EducationLevel | string;
  description: string;
  duration: string;
  pricePerSession: number;
  deliveryModes: "online" | "offline" | "both";
  tags: string[];
}

interface ScheduleTimeSlot {
  id: number; // Schedule ID for easier reference when booking
  startTime: string; // Format HH:mm (example: "08:00")
  endTime: string; // Format HH:mm (example: "10:00")
}

interface ScheduleDay {
  date: string; // Format: "2025-05-16"
  timeSlots: ScheduleTimeSlot[];
}

// Định nghĩa kiểu dữ liệu cho khung giờ
type TimeSlot = {
  id: number; // Schedule ID for easier reference when booking
  startTime: string; // Format HH:mm (example: "08:00")
  endTime: string; // Format HH:mm (example: "10:00")
};

// Custom type để lưu trữ thông tin về các buổi học đã chọn
type SelectedSessionInfo = {
  date: Date;
  timeSlots: TimeSlot[];
};

// Định nghĩa kiểu booking để trả về API
type BookingInfo = {
  scheduleId: number; // ID of the teaching schedule
  date: string; // Format YYYY-MM-DD (example: "2025-05-16")
  startTime: string; // Format HH:mm (example: "08:00")
  endTime: string; // Format HH:mm (example: "10:00")
};

// Form schema
const bookingFormSchema = z
  .object({
    tutorId: z.string({
      required_error: "Vui lòng chọn gia sư",
    }),
    courseId: z.string({
      required_error: "Vui lòng chọn khóa học",
    }),
    bookings: z
      .array(
        z
          .object({
            scheduleId: z.number({
              required_error: "ID lịch học không được cung cấp",
            }),
            date: z
              .string({
                required_error: "Vui lòng chọn ngày học",
              })
              .regex(
                /^\d{4}-\d{2}-\d{2}$/,
                "Định dạng ngày phải là YYYY-MM-DD"
              ),
            startTime: z
              .string({
                required_error: "Vui lòng chọn giờ bắt đầu",
              })
              .regex(
                /^([01]\d|2[0-3]):([0-5]\d)$/,
                "Định dạng giờ phải là HH:mm"
              ),
            endTime: z
              .string({
                required_error: "Vui lòng chọn giờ kết thúc",
              })
              .regex(
                /^([01]\d|2[0-3]):([0-5]\d)$/,
                "Định dạng giờ phải là HH:mm"
              ),
          })
          .refine(
            (data) => {
              // Convert time strings to comparable values
              const [startHour, startMinute] = data.startTime
                .split(":")
                .map(Number);
              const [endHour, endMinute] = data.endTime.split(":").map(Number);

              // Compare times to ensure end time is after start time
              if (endHour > startHour) return true;
              if (endHour === startHour) return endMinute > startMinute;
              return false;
            },
            {
              message: "Thời gian kết thúc phải sau thời gian bắt đầu",
              path: ["endTime"],
            }
          )
      )
      .min(1, { message: "Vui lòng chọn ít nhất một buổi học" }),
    mode: z.enum(["online", "offline"], {
      required_error: "Vui lòng chọn hình thức học",
    }),
    location: z.string().optional(),
    note: z
      .string()
      .max(300, "Lời nhắn không được vượt quá 300 ký tự")
      .optional(),
  })
  .refine(
    (data) => {
      // Validate that if mode is offline, location is provided
      if (data.mode === "offline") {
        return !!data.location && data.location.trim() !== "";
      }
      return true;
    },
    {
      message: "Vui lòng nhập địa điểm học khi chọn hình thức học trực tiếp",
      path: ["location"],
    }
  );

type BookingFormValues = z.infer<typeof bookingFormSchema>;

// API functions to fetch data from backend
const fetchTutor = async (tutorId: string): Promise<Tutor> => {
  console.log("Fetching tuto");
  const response = await fetch(`/api/v1/tutors/${tutorId}`);

  console.log("Fetching tutor data from API:", response);
  if (!response.ok) {
    throw new Error(`Error fetching tutor data: ${response.statusText}`);
  }
  return response.json();
};

const fetchCourse = async (courseId: string): Promise<Course> => {
  const response = await fetch(`/api/v1/courses/${courseId}`);
  if (!response.ok) {
    throw new Error(`Error fetching course data: ${response.statusText}`);
  }
  return response.json();
};

const fetchTutorSchedule = async (tutorId: string): Promise<ScheduleDay[]> => {
  // Add optional query parameters for course or date filtering
  const courseId = new URLSearchParams(window.location.search).get("course");
  const queryParams = new URLSearchParams();
  if (courseId) {
    queryParams.append("course", courseId);
  }
  // Create URL with query parameters
  const url = `/api/v1/schedules/${tutorId}${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  console.log("Fetching schedule data from URL:", url);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Error fetching schedule data: ${response.statusText}`);
  }

  const result = await response.json();
  console.log("Schedule API response:", result);
  // Handle the API response format
  if (result.success) {
    console.log("Available schedule data:", result.data);

    // Process the data to ensure time slots are in HH:MM format (without seconds)
    const processedData = (result.data || []).map((day: any) => ({
      date: day.date,
      timeSlots: (day.timeSlots || []).map((slot: any) => ({
        id: slot.id,
        startTime: slot.startTime
          ? slot.startTime.substring(0, 5)
          : slot.startTime,
        endTime: slot.endTime ? slot.endTime.substring(0, 5) : slot.endTime,
      })),
    }));

    console.log("Processed schedule data:", processedData);
    return processedData;
  } else {
    throw new Error(result.message || "Failed to fetch schedule data");
  }
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tutorId = params?.tutorId;
  const courseId = new URLSearchParams(window.location.search).get("course");
  const { toast } = useToast();

  // React Query hooks with proper error handling and loading states
  const {
    data: tutor,
    isLoading: tutorLoading,
    error: tutorError,
  } = useQuery<Tutor, Error>({
    queryKey: ["tutor", tutorId],
    queryFn: () =>
      tutorId ? fetchTutor(tutorId) : Promise.reject("No tutor ID provided"),
    enabled: !!tutorId,
  });

  const {
    data: course,
    isLoading: courseLoading,
    error: courseError,
  } = useQuery<Course, Error>({
    queryKey: ["course", courseId],
    queryFn: () =>
      courseId
        ? fetchCourse(courseId)
        : Promise.reject("No course ID provided"),
    enabled: !!courseId,
  });

  const {
    data: availability,
    isLoading: scheduleLoading,
    error: scheduleError,
  } = useQuery<ScheduleDay[], Error>({
    queryKey: ["schedule", tutorId],
    queryFn: () =>
      tutorId
        ? fetchTutorSchedule(tutorId)
        : Promise.reject("No tutor ID provided"),
    enabled: !!tutorId,
  });

  // Setup form with default values
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      tutorId: tutorId || "",
      courseId: courseId || "",
      bookings: [],
      mode: undefined, // Will be updated when course data is available
      note: "",
    },
  });

  // Watch the mode field to conditionally render fields
  const watchMode = form.watch("mode");

  useEffect(() => {
    if (course?.deliveryModes) {
      const mode =
        course.deliveryModes === "online"
          ? "online"
          : course.deliveryModes === "offline"
          ? "offline"
          : null;

      if (mode) {
        form.setValue("mode", mode);
      }
    }
  }, [course, form]);

  // Khởi tạo availableTimeSlots khi component mount
  useEffect(() => {
    console.log("Processing availability data:", availability);
    if (availability && Array.isArray(availability)) {
      const slotsMap: Record<string, TimeSlot[]> = {};

      // Log available dates clearly
      console.log(
        "Available dates from API:",
        availability.map((item) => item.date).join(", ")
      );

      availability.forEach((item) => {
        if (item && item.date) {
          const dateKey = format(parseISO(item.date), "yyyy-MM-dd");
          console.log(`Adding time slots for date ${dateKey}:`, item.timeSlots);

          // Make sure time slots have proper format (HH:MM without seconds)
          const formattedTimeSlots = (item.timeSlots || []).map((slot) => ({
            id: slot.id,
            startTime: slot.startTime
              ? slot.startTime.substring(0, 5)
              : slot.startTime,
            endTime: slot.endTime ? slot.endTime.substring(0, 5) : slot.endTime,
          }));

          slotsMap[dateKey] = formattedTimeSlots;
        }
      });
      console.log("Final availableTimeSlotsMap:", slotsMap);
      setAvailableTimeSlotsMap(slotsMap);
    }
  }, [availability]);

  // Chuyển đổi selectedSessions sang định dạng bookings cho form
  useEffect(() => {
    const bookings: BookingInfo[] = selectedSessions.flatMap((session) => {
      const dateStr = format(session.date, "yyyy-MM-dd");
      return session.timeSlots.map((timeSlot) => ({
        scheduleId: timeSlot.id, // Include the schedule ID for the booking
        date: dateStr,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
      }));
    });

    form.setValue("bookings", bookings, {
      shouldValidate: true,
    });
  }, [selectedSessions, form]);
  // Add indicator for schedule data status
  const hasAvailabilityData =
    availability && Array.isArray(availability) && availability.length > 0;

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
      const existingTimeSlots = [...newSessions[sessionIndex].timeSlots]; // Kiểm tra xem khung giờ đã được chọn chưa
      const timeSlotIndex = existingTimeSlots.findIndex(
        (slot) =>
          // If we have an ID, prefer to use that for comparison
          (slot.id && timeSlot.id && slot.id === timeSlot.id) ||
          // Otherwise fall back to comparing start/end times
          (slot.startTime === timeSlot.startTime &&
            slot.endTime === timeSlot.endTime)
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
        // Use ID for comparison if available
        (slot.id && timeSlot.id && slot.id === timeSlot.id) ||
        // Fall back to comparing start/end times
        (slot.startTime === timeSlot.startTime &&
          slot.endTime === timeSlot.endTime)
    );
  }; // Check if a date has available slots
  const hasTimeSlots = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const hasSlots =
      availableTimeSlotsMap[dateStr] &&
      availableTimeSlotsMap[dateStr].length > 0;

    // Log all date checks to debug calendar highlighting
    console.log(
      `Checking date ${dateStr} - has slots: ${hasSlots ? "YES" : "NO"}`
    );

    // Only log slot details for dates that have slots to avoid console spam
    if (hasSlots) {
      console.log(
        `Date ${dateStr} available time slots:`,
        availableTimeSlotsMap[dateStr]
      );
    }

    return hasSlots;
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

  // Form submission handling
  const onSubmit = async (data: BookingFormValues) => {
    // Form is already validated through the Zod schema, so we can proceed directly

    // If all validations passed, proceed with form submission
    console.log("Form data:", data);
    console.log("Selected bookings:", data.bookings); // Format the data to match the expected structure
    const bookingData = {
      tutorId: data.tutorId,
      courseId: data.courseId,
      mode: data.mode,
      location: data.location,
      note: data.note,
      bookings: data.bookings,
    };

    // Set loading state
    setIsSubmitting(true);

    try {
      // Lưu dữ liệu vào localStorage để sử dụng ở trang thanh toán
      localStorage.setItem("bookingData", JSON.stringify(bookingData));

      // Lưu thông tin khóa học và gia sư để hiển thị ở trang thanh toán
      if (course) {
        localStorage.setItem("selectedCourse", JSON.stringify(course));
      }

      if (tutor) {
        localStorage.setItem("selectedTutor", JSON.stringify(tutor));
      }

      // Show success toast
      toast({
        title: "Xác nhận đặt lịch thành công",
        description: "Vui lòng tiếp tục để hoàn thành thanh toán.",
      });

      // Redirect to payment page after short delay
      setTimeout(() => {
        window.location.href = "/payment";
      }, 1000);
    } catch (error) {
      // Show error toast in case localStorage fails
      toast({
        title: "Đặt lịch thất bại",
        description:
          "Có lỗi xảy ra khi lưu thông tin đặt lịch. Vui lòng thử lại.",
        variant: "destructive",
      });
      console.error("Booking data storage error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="container mx-auto pt-4 pb-8 px-4 md:px-6">
        <nav className="flex items-center space-x-1 text-sm mb-6">
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
          <span className="font-medium">Đặt lịch học</span>
        </nav>
        <h1 className="text-3xl font-bold mb-2">Đặt lịch học</h1>
        <div className="flex flex-wrap items-center gap-x-2 mb-8">
          {tutorLoading || courseLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-muted-foreground">Đang tải thông tin...</p>
            </div>
          ) : tutorError || courseError ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p>Không thể tải thông tin. Vui lòng thử lại sau.</p>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Đặt lịch học với gia sư{" "}
              <span className="text-foreground font-medium">
                {tutor?.user
                  ? `${tutor.user.first_name} ${tutor.user.last_name}`
                  : "Gia sư"}
              </span>
              cho khóa học{" "}
              <span className="text-foreground font-medium">
                {course?.title}
              </span>
            </p>
          )}
        </div>

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
                    {" "}
                    {/* Date selection */}
                    <FormField
                      control={form.control}
                      name="bookings"
                      render={() => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="flex items-center gap-2">
                            Chọn ngày học
                            {scheduleLoading && (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </FormLabel>
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
                                  disabled={scheduleLoading || !!scheduleError}
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
                          </Popover>{" "}
                          <FormDescription>
                            {scheduleError ? (
                              <div className="text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                <span>Không thể tải lịch dạy</span>
                              </div>
                            ) : !hasAvailabilityData && !scheduleLoading ? (
                              <div className="text-amber-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                <span>Gia sư chưa cập nhật lịch dạy</span>
                              </div>
                            ) : (
                              <span></span>
                            )}
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
                                  {/* <FormLabel className="text-xs">
                                    Chọn khung giờ học (có thể chọn nhiều)
                                  </FormLabel> */}
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
                                            "flex items-center justify-center gap-1.5 text-xs py-5 transition-all",
                                            isSelected
                                              ? "bg-primary text-primary-foreground shadow-sm"
                                              : "hover:bg-primary/10 hover:border-primary/50"
                                          )}
                                          onClick={() =>
                                            handleTimeSlotSelect(date, slot)
                                          }
                                        >
                                          <Clock
                                            className={cn(
                                              "w-3 h-3 mr-1",
                                              isSelected
                                                ? "text-current"
                                                : "text-muted-foreground"
                                            )}
                                          />
                                          <span className="whitespace-nowrap font-medium">
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
                          {selectedSessions.length !== selectedDates.length ? (
                            <div className="flex items-center p-2 bg-destructive/10 text-destructive rounded-md text-sm">
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 15 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4 mr-2"
                              >
                                <path
                                  d="M7.49991 0.877045C3.84222 0.877045 0.877075 3.84219 0.877075 7.49988C0.877075 11.1575 3.84222 14.1227 7.49991 14.1227C11.1576 14.1227 14.1227 11.1575 14.1227 7.49988C14.1227 3.84219 11.1576 0.877045 7.49991 0.877045ZM1.82708 7.49988C1.82708 4.36686 4.36689 1.82704 7.49991 1.82704C10.6329 1.82704 13.1727 4.36686 13.1727 7.49988C13.1727 10.6329 10.6329 13.1727 7.49991 13.1727C4.36689 13.1727 1.82708 10.6329 1.82708 7.49988ZM8.24992 10.5C8.24992 10.9142 7.91413 11.25 7.49992 11.25C7.08571 11.25 6.74992 10.9142 6.74992 10.5C6.74992 10.0858 7.08571 9.75 7.49992 9.75C7.91413 9.75 8.24992 10.0858 8.24992 10.5ZM6.85358 4.89862C6.85358 4.47442 7.18936 4.13864 7.61356 4.13864C8.03776 4.13864 8.37354 4.47442 8.37354 4.89862V7.49988C8.37354 7.92408 8.03776 8.25986 7.61356 8.25986C7.18936 8.25986 6.85358 7.92408 6.85358 7.49988V4.89862Z"
                                  fill="currentColor"
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                ></path>
                              </svg>
                              Vui lòng chọn khung giờ học cho tất cả các ngày
                              (còn thiếu{" "}
                              {selectedDates.length - selectedSessions.length}{" "}
                              ngày)
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground flex items-center">
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 15 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4 mr-2 text-green-600"
                              >
                                <path
                                  d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                                  fill="currentColor"
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                ></path>
                              </svg>
                              Đã chọn{" "}
                              {selectedSessions.reduce(
                                (total, session) =>
                                  total + session.timeSlots.length,
                                0
                              )}{" "}
                              khung giờ học cho {selectedDates.length} ngày
                            </p>
                          )}
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
                    {course?.deliveryModes && (
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
                                {(course.deliveryModes === "online" ||
                                  course.deliveryModes === "both") && (
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
                                {(course.deliveryModes === "offline" ||
                                  course.deliveryModes === "both") && (
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
                    {/* Optional note */}
                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lời nhắn (không bắt buộc)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Textarea
                                placeholder="Nhập lời nhắn cho gia sư (nhu cầu học tập, mong muốn...)"
                                className="resize-none min-h-[100px]"
                                maxLength={300}
                                {...field}
                              />
                              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                {field.value?.length || 0}/300
                              </div>
                            </div>
                          </FormControl>
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
                  disabled={!form.formState.isValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    "Xác nhận đặt lịch"
                  )}
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
                {courseLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
                  </div>
                ) : courseError ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-destructive">
                    <AlertCircle className="h-8 w-8" />
                    <p>Không thể tải thông tin khóa học</p>
                  </div>
                ) : course ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-base md:text-lg mb-1">
                        {course.title}
                      </h3>{" "}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="bg-primary/5">
                          {typeof course.subject === "object" &&
                          course.subject !== null
                            ? course.subject.name
                            : course.subject}
                        </Badge>{" "}
                        <Badge variant="outline" className="bg-primary/5">
                          {typeof course.educationLevel === "object" &&
                          course.educationLevel !== null
                            ? course.educationLevel.name
                            : course.educationLevel}
                        </Badge>
                        {course.tags?.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-secondary/20"
                          >
                            {tag}
                          </Badge>
                        ))}
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
                          }).format(course.pricePerSession)}
                          /Giờ
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Hình thức:</span>
                        <span className="flex items-center gap-2">
                          {(course.deliveryModes === "online" ||
                            course.deliveryModes === "both") && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              Online
                            </span>
                          )}
                          {(course.deliveryModes === "offline" ||
                            course.deliveryModes === "both") && (
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                              Offline
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Không có dữ liệu khóa học
                  </p>
                )}
              </CardContent>
            </Card>
            {/* Tutor information card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Thông tin gia sư</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                {tutorLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
                  </div>
                ) : tutorError ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-destructive">
                    <AlertCircle className="h-8 w-8" />
                    <p>Không thể tải thông tin gia sư</p>
                  </div>
                ) : tutor ? (
                  <>
                    {" "}
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
                        {/* <p className="text-sm text-muted-foreground">
                          {tutor.experience_years
                            ? `${tutor.experience_years} năm kinh nghiệm giảng dạy`
                            : "Chưa có thông tin kinh nghiệm"}
                        </p> */}
                      </div>
                    </div>{" "}
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Email:</span>{" "}
                        {tutor.user?.email || "Chưa có thông tin"}
                      </p>
                      {/* <p className="text-sm">
                        <span className="font-medium">Địa điểm:</span>{" "}
                        {tutor.address || "Chưa có thông tin địa điểm"}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Ngày sinh:</span>{" "}
                        {tutor.date_of_birth
                          ? format(new Date(tutor.date_of_birth), "dd/MM/yyyy")
                          : "Chưa có thông tin"}
                      </p> */}
                      <p className="text-sm flex items-center gap-2">
                        <span className="font-medium">Xác minh:</span>{" "}
                        {tutor.is_verified ? (
                          <span className="inline-flex items-center bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              ></path>
                            </svg>
                            Đã xác minh
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                            Chưa xác minh
                          </span>
                        )}
                      </p>{" "}
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Giới thiệu:</p>
                        <div className="text-sm bg-muted/40 p-3 rounded-md">
                          {tutor.bio || "Chưa có thông tin giới thiệu"}
                        </div>
                      </div>{" "}
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Môn học:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tutor.subjects && tutor.subjects.length > 0 ? (
                            tutor.subjects.map((subject, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {typeof subject === "object" && subject !== null
                                  ? subject.name
                                  : subject}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Chưa có thông tin môn học
                            </span>
                          )}
                        </div>
                      </div>{" "}
                      {/* {tutor.certifications && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Chứng nhận:</p>
                          <div className="text-sm bg-muted/40 p-3 rounded-md">
                            {(() => {
                              try {
                                const certs = JSON.parse(
                                  tutor.certifications || "[]"
                                );
                                return Array.isArray(certs) &&
                                  certs.length > 0 ? (
                                  <p>Gia sư đã được xác thực chứng nhận</p>
                                ) : (
                                  <p>Chưa có thông tin chứng nhận</p>
                                );
                              } catch (e) {
                                return <p>Chưa có thông tin chứng nhận</p>;
                              }
                            })()}
                          </div>
                        </div>
                      )} */}
                      {tutor.availability && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Lịch dạy:</p>
                          <div className="text-sm bg-muted/40 p-3 rounded-md">
                            {tutor.availability || "Linh hoạt"}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Không có dữ liệu gia sư
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
