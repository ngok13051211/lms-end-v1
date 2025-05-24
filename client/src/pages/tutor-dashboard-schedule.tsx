import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, addDays, parseISO, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Schedule {
  id: number;
  tutor_id: number;
  course_id?: number;
  date: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  status: "available" | "booked" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
  course?: {
    id: number;
    title: string;
  };
}

interface ScheduleEvent {
  id: string | number;
  title: string;
  student?: string;
  time: string;
  date: Date;
  type: "available" | "booked" | "cancelled";
}

interface CreateSingleSessionInput {
  date: Date;
  startTime: string;
  endTime: string;
}

interface CreateRecurringSessionInput {
  startDate: Date;
  endDate: Date;
  schedule: {
    [key: string]: {
      startTime: string;
      endTime: string;
    }[];
  };
}

// API function to create a single session schedule
const createSingleSession = async (data: CreateSingleSessionInput) => {
  const response = await fetch("/api/v1/schedules", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      date: format(data.date, "yyyy-MM-dd"),
      start_time: data.startTime,
      end_time: data.endTime,
      is_recurring: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create schedule");
  }

  return response.json();
};

const createRecurringSessions = async (data: CreateRecurringSessionInput) => {
  try {
    // Debug input
    console.log("Creating recurring sessions with input:", data);

    // Kiểm tra và đảm bảo dữ liệu ngày là hợp lệ
    if (
      !data.startDate ||
      !data.endDate ||
      isNaN(data.startDate.getTime()) ||
      isNaN(data.endDate.getTime())
    ) {
      throw new Error("Ngày bắt đầu hoặc kết thúc không hợp lệ");
    }

    const startDateStr = format(data.startDate, "yyyy-MM-dd");
    const endDateStr = format(data.endDate, "yyyy-MM-dd");

    // Kiểm tra schedule có dữ liệu không
    const dayKeys = Object.keys(data.schedule);
    if (dayKeys.length === 0) {
      throw new Error("Cần chọn ít nhất một ngày trong tuần");
    }

    // Lấy khung giờ đầu tiên từ ngày đầu tiên trong schedule
    const firstDay = dayKeys[0];
    const firstTimeSlot = data.schedule[firstDay][0] || {
      startTime: "08:00",
      endTime: "09:00",
    };

    // Tạo payload đầy đủ và chính xác theo yêu cầu schema
    // QUAN TRỌNG: Đảm bảo không có thuộc tính nào undefined
    const payload = {
      is_recurring: true,
      start_date: startDateStr,
      end_date: endDateStr,
      repeat_schedule: data.schedule || {}, // Đảm bảo không undefined
      // Các trường bắt buộc cho schema validation
      date: startDateStr,
      start_time: firstTimeSlot.startTime,
      end_time: firstTimeSlot.endTime,
    };

    // Log payload chi tiết để debug
    console.log("Sending payload:", JSON.stringify(payload, null, 2));

    // QUAN TRỌNG: Đảm bảo gửi đúng định dạng dữ liệu
    const formattedPayload = JSON.stringify(payload);
    console.log("FormattedPayload:", formattedPayload);

    // Gửi yêu cầu với token (nếu có)
    const token = localStorage.getItem("token");
    const response = await fetch("/api/v1/schedules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: formattedPayload,
    });

    // Kiểm tra response status
    console.log("Response status:", response.status);

    const responseData = await response.json();
    console.log("Response data:", responseData);

    // Log chi tiết hơn về lỗi nếu có
    if (!response.ok) {
      console.error("API Error:", responseData);
      if (responseData.errors) {
        console.error("Validation errors:", responseData.errors);
        const errorDetails = responseData.errors
          .map((e: any) => `${e.path?.join(".")}: ${e.message}`)
          .join("; ");
        throw new Error(`Validation error: ${errorDetails}`);
      }
      throw new Error(
        responseData.message || "Failed to create recurring schedule"
      );
    }

    return responseData;
  } catch (error) {
    console.error("Error in createRecurringSessions:", error);
    throw error;
  }
};

// API function to fetch tutor schedules
const fetchTutorSchedules = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch("/api/v1/schedules/tutor", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include", // cookies được gửi trong request
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch schedules");
  }

  return response.json();
};

// API function hủy lịch
const cancelSchedule = async (scheduleId: number) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(`/api/v1/schedules/${scheduleId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json();
    // Log debug
    console.error("Cancel schedule error:", errorData);
    throw new Error(errorData.message || "Failed to cancel schedule");
  }

  return response.json();
};

// API function xóa lịch đã hủy
const deleteSchedule = async (scheduleId: number) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(`/api/v1/schedules/${scheduleId}/permanent`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Delete schedule error:", errorData);
    throw new Error(errorData.error?.message || "Failed to delete schedule");
  }

  return response.json();
};

// Function to get status badge variant
const getStatusBadgeVariant = (
  status: string
): "default" | "destructive" | "outline" | "secondary" => {
  switch (status) {
    case "available":
      return "outline";
    case "booked":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
};

// Function to translate status text to Vietnamese
const translateStatus = (status: string) => {
  switch (status) {
    case "available":
      return "Chưa đặt";
    case "booked":
      return "Đã đặt";
    case "completed":
      return "Đã dạy";
    case "cancelled":
      return "Đã huỷ";
    default:
      return status;
  }
};

// Function to get status emoji
const getStatusEmoji = (status: string) => {
  switch (status) {
    case "available":
      return "🟢";
    case "booked":
      return "🔴";
    case "completed":
      return "✅";
    case "cancelled":
      return "❌";
    default:
      return "⚪";
  }
};

export default function TutorSchedulePage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState<string>("single");
  const [viewMode, setViewMode] = useState<"calendar" | "table">("table");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Single session form state
  const [singleSessionForm, setSingleSessionForm] =
    useState<CreateSingleSessionInput>({
      date: new Date(),
      startTime: "08:00",
      endTime: "10:00",
    }); // Recurring session form state
  const [recurringSessionForm, setRecurringSessionForm] =
    useState<CreateRecurringSessionInput>({
      startDate: new Date(),
      endDate: addDays(new Date(), 30),
      schedule: {},
    });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scheduleToCancel, setScheduleToCancel] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch tutor schedules
  const {
    data: scheduleData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tutorSchedules"],
    queryFn: fetchTutorSchedules,
  });

  // Mutation for creating a single session
  const createSingleSessionMutation = useMutation({
    mutationFn: createSingleSession,
    onMutate: (variables) => {
      console.log("Creating single session with data:", variables);
    },
    onSuccess: (data) => {
      console.log("Single session created successfully:", data);
      // Invalidate and refetch schedules query
      queryClient.invalidateQueries({ queryKey: ["tutorSchedules"] });
      setIsDialogOpen(false);
      toast({
        title: "Lịch đã được tạo",
        description: "Lịch trống của bạn đã được tạo thành công",
      });
    },
    onError: (error) => {
      console.error("Error creating single session:", error);
      toast({
        title: "Lỗi",
        description: `Không thể tạo lịch: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation for creating recurring sessions
  const createRecurringSessionsMutation = useMutation({
    mutationFn: createRecurringSessions,
    onMutate: (variables) => {
      console.log("Creating recurring sessions with data:", variables);
    },
    onSuccess: (data) => {
      console.log("Recurring sessions created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["tutorSchedules"] });
      setIsDialogOpen(false);
      toast({
        title: "Lịch định kỳ đã được tạo",
        description: "Lịch định kỳ của bạn đã được tạo thành công",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: `Không thể tạo lịch định kỳ: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation for cancelling a schedule
  const cancelScheduleMutation = useMutation({
    mutationFn: cancelSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorSchedules"] });
      toast({
        title: "Lịch dạy đã huỷ",
        description: "Đã huỷ lịch dạy thành công",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: `Không thể huỷ lịch: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation for delete a schedule
  const deleteScheduleMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorSchedules"] });
      toast({
        title: "Xóa lịch thành công",
        description: "Lịch đã được xóa khỏi hệ thống",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: `Không thể xóa lịch: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Process schedules data
  const schedules: Schedule[] = scheduleData?.schedules || [];

  // Filter schedules by status
  const filteredSchedules = schedules.filter(
    (schedule) => statusFilter === "all" || schedule.status === statusFilter
  );

  // Calendar-formatted events
  const calendarEvents: ScheduleEvent[] = schedules.map((schedule) => ({
    id: schedule.id,
    title: schedule.course?.title || "Lịch trống",
    time: `${schedule.start_time} - ${schedule.end_time}`,
    date: parseISO(schedule.date),
    type: schedule.status === "available" ? "available" : "booked",
  }));

  // Filter events for selected date in calendar view
  const selectedDateEvents = calendarEvents.filter(
    (event) => date && isSameDay(event.date, date)
  );

  // Thêm validation cho form tạo lịch đơn lẻ
  const handleSingleSessionSubmit = () => {
    // Validate input data
    if (!singleSessionForm.date) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ngày",
        variant: "destructive",
      });
      return;
    }

    if (singleSessionForm.startTime >= singleSessionForm.endTime) {
      toast({
        title: "Lỗi",
        description: "Thời gian bắt đầu phải trước thời gian kết thúc",
        variant: "destructive",
      });
      return;
    }

    createSingleSessionMutation.mutate(singleSessionForm);
  }; // Thêm validation cho form tạo lịch định kỳ
  const handleRecurringSessionSubmit = () => {
    try {
      // Validate input data
      const selectedDays = Object.keys(recurringSessionForm.schedule);

      if (selectedDays.length === 0) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn ít nhất một ngày trong tuần",
          variant: "destructive",
        });
        return;
      }

      // Kiểm tra ngày bắt đầu và kết thúc
      if (
        !recurringSessionForm.startDate ||
        !recurringSessionForm.endDate ||
        isNaN(recurringSessionForm.startDate.getTime()) ||
        isNaN(recurringSessionForm.endDate.getTime())
      ) {
        toast({
          title: "Lỗi",
          description: "Ngày bắt đầu hoặc kết thúc không hợp lệ",
          variant: "destructive",
        });
        return;
      }

      if (recurringSessionForm.startDate >= recurringSessionForm.endDate) {
        toast({
          title: "Lỗi",
          description: "Ngày bắt đầu phải trước ngày kết thúc",
          variant: "destructive",
        });
        return;
      }

      // Kiểm tra chi tiết cho mỗi ngày đã chọn
      let hasError = false;
      selectedDays.forEach((day) => {
        const slots = recurringSessionForm.schedule[day];

        if (!slots || slots.length === 0) {
          toast({
            title: "Lỗi",
            description: `Cần có ít nhất một khung giờ cho ${getVietnameseDay(
              day
            )}`,
            variant: "destructive",
          });
          hasError = true;
          return;
        }

        // Kiểm tra từng khung giờ trong ngày
        slots.forEach((slot, index) => {
          if (!slot.startTime || !slot.endTime) {
            toast({
              title: "Lỗi",
              description: `Khung giờ ${index + 1} của ${getVietnameseDay(
                day
              )} thiếu thông tin`,
              variant: "destructive",
            });
            hasError = true;
            return;
          }

          if (slot.startTime >= slot.endTime) {
            toast({
              title: "Lỗi",
              description: `Thời gian bắt đầu phải trước thời gian kết thúc (${getVietnameseDay(
                day
              )}, khung ${index + 1})`,
              variant: "destructive",
            });
            hasError = true;
            return;
          }
        });
      });

      if (hasError) return;

      // Sau khi đã validate kỹ, chuẩn bị dữ liệu và gọi API
      // In ra thông tin trước khi gọi API để debug
      console.log(
        "Final form data:",
        JSON.stringify(recurringSessionForm, null, 2)
      );

      // Đảm bảo đủ dữ liệu trước khi gọi API
      const validatedForm = {
        ...recurringSessionForm,
        startDate: recurringSessionForm.startDate || new Date(),
        endDate: recurringSessionForm.endDate || addDays(new Date(), 30),
      };
      createRecurringSessionsMutation.mutate(validatedForm);
    } catch (error) {
      console.error("Error in handleRecurringSessionSubmit:", error);
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi xử lý form",
        variant: "destructive",
      });
    }
  };

  // Hàm helper để hiển thị tên ngày tiếng Việt
  const getVietnameseDay = (day: string) => {
    const dayMap: Record<string, string> = {
      monday: "Thứ 2",
      tuesday: "Thứ 3",
      wednesday: "Thứ 4",
      thursday: "Thứ 5",
      friday: "Thứ 6",
      saturday: "Thứ 7",
      sunday: "Chủ nhật",
    };
    return dayMap[day] || day;
  };
  // Handle day toggle for recurring sessions
  const handleDayToggle = (day: string, checked: boolean) => {
    setRecurringSessionForm((prev) => {
      const newSchedule = { ...prev.schedule };

      if (checked) {
        // Add day with default time slot
        newSchedule[day] = [{ startTime: "08:00", endTime: "10:00" }];
      } else {
        // Remove day
        delete newSchedule[day];
      }

      return {
        ...prev,
        schedule: newSchedule,
      };
    });
  };

  // Add a time slot for a specific day
  const addTimeSlotForDay = (day: string) => {
    setRecurringSessionForm((prev) => {
      const daySlots = [...(prev.schedule[day] || [])];
      daySlots.push({ startTime: "08:00", endTime: "10:00" });

      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [day]: daySlots,
        },
      };
    });
  };

  // Remove a time slot for a specific day
  const removeTimeSlotForDay = (day: string, index: number) => {
    setRecurringSessionForm((prev) => {
      const daySlots = [...(prev.schedule[day] || [])];
      daySlots.splice(index, 1);

      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [day]: daySlots,
        },
      };
    });
  };

  // Update a time slot for a specific day
  const updateTimeSlotForDay = (
    day: string,
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setRecurringSessionForm((prev) => {
      const daySlots = [...(prev.schedule[day] || [])];
      daySlots[index] = { ...daySlots[index], [field]: value };

      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [day]: daySlots,
        },
      };
    });
  };

  // Handle schedule cancellation
  const handleCancelSchedule = () => {
    if (scheduleToCancel) {
      cancelScheduleMutation.mutate(scheduleToCancel);
      setScheduleToCancel(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="container p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Lịch dạy</h1>
          <Button onClick={() => setIsDialogOpen(true)}>Tạo lịch mới</Button>
        </div>

        {/* View Mode and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
          <div className="flex gap-4">
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "calendar" | "table")}
              className="w-[400px]"
            >
              <TabsList>
                <TabsTrigger value="table">Dạng bảng</TabsTrigger>
                <TabsTrigger value="calendar">Lịch theo ngày</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex gap-2 items-center">
            <Label htmlFor="status-filter" className="mr-2">
              Lọc theo trạng thái:
            </Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="available">🟢 Chưa đặt</SelectItem>
                  <SelectItem value="booked">🔴 Đã đặt</SelectItem>
                  <SelectItem value="completed">✅ Đã dạy</SelectItem>
                  <SelectItem value="cancelled">❌ Đã huỷ</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table View */}
        {viewMode === "table" && (
          <Card>
            <CardHeader>
              <CardTitle>Danh sách lịch dạy</CardTitle>
              <CardDescription>
                Quản lý lịch dạy và xem tình trạng các buổi học
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : isError ? (
                <div className="text-center py-8 text-destructive">
                  Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.
                </div>
              ) : filteredSchedules.length > 0 ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Khóa học</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell>
                            {format(parseISO(schedule.date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            {schedule.start_time} - {schedule.end_time}
                          </TableCell>
                          <TableCell>{schedule.course?.title || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusBadgeVariant(schedule.status)}
                            >
                              {getStatusEmoji(schedule.status)}{" "}
                              {translateStatus(schedule.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {schedule.status === "available" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setScheduleToCancel(schedule.id)
                                    }
                                  >
                                    Huỷ lịch
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Xác nhận huỷ lịch
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Bạn có chắc chắn muốn huỷ lịch dạy này
                                      không? Hành động này không thể khôi phục.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel
                                      onClick={() => setScheduleToCancel(null)}
                                    >
                                      Không
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleCancelSchedule}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      {cancelScheduleMutation.isPending ? (
                                        <span className="flex items-center gap-1">
                                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                                          Đang huỷ...
                                        </span>
                                      ) : (
                                        "Huỷ lịch"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            {/* Thêm nút xóa cho lịch đã hủy */}
                            {schedule.status === "cancelled" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    Xóa lịch
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Xác nhận xóa lịch
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Bạn có chắc chắn muốn xóa lịch này khỏi hệ
                                      thống? Hành động này không thể khôi phục.
                                      Sau khi xóa, bạn có thể tạo lịch mới vào
                                      khoảng thời gian này.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Không</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        deleteScheduleMutation.mutate(
                                          schedule.id
                                        )
                                      }
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      {deleteScheduleMutation.isPending ? (
                                        <span className="flex items-center gap-1">
                                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                                          Đang xóa...
                                        </span>
                                      ) : (
                                        "Xóa lịch"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-2"
                                >
                                  Chi tiết
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Chi tiết lịch dạy</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-medium">
                                      Ngày
                                    </Label>
                                    <div className="col-span-3">
                                      {format(
                                        parseISO(schedule.date),
                                        "EEEE, dd MMMM yyyy",
                                        { locale: vi }
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-medium">
                                      Thời gian
                                    </Label>
                                    <div className="col-span-3">
                                      {schedule.start_time} -{" "}
                                      {schedule.end_time}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-medium">
                                      Khóa học
                                    </Label>
                                    <div className="col-span-3">
                                      {schedule.course?.title || "-"}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-medium">
                                      Trạng thái
                                    </Label>
                                    <div className="col-span-3">
                                      <Badge
                                        variant={getStatusBadgeVariant(
                                          schedule.status
                                        )}
                                      >
                                        {getStatusEmoji(schedule.status)}{" "}
                                        {translateStatus(schedule.status)}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-medium">
                                      Định kỳ
                                    </Label>
                                    <div className="col-span-3">
                                      {schedule.is_recurring ? "Có" : "Không"}
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  {schedule.status === "available" && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          onClick={() =>
                                            setScheduleToCancel(schedule.id)
                                          }
                                        >
                                          Huỷ lịch
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Xác nhận huỷ lịch
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Bạn có chắc chắn muốn huỷ lịch dạy
                                            này không? Hành động này không thể
                                            khôi phục.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel
                                            onClick={() =>
                                              setScheduleToCancel(null)
                                            }
                                          >
                                            Không
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={handleCancelSchedule}
                                            className="bg-destructive hover:bg-destructive/90"
                                          >
                                            {cancelScheduleMutation.isPending ? (
                                              <span className="flex items-center gap-1">
                                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                                                Đang huỷ...
                                              </span>
                                            ) : (
                                              "Huỷ lịch"
                                            )}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {statusFilter === "all"
                    ? "Chưa có lịch dạy nào. Hãy tạo lịch mới."
                    : `Không có lịch dạy nào với trạng thái "${translateStatus(
                        statusFilter
                      )}".`}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Lịch</CardTitle>
                  <CardDescription>Xem lịch dạy theo ngày</CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border"
                    locale={vi}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Lịch dạy{" "}
                    {date && format(date, "EEEE, dd MMMM yyyy", { locale: vi })}
                  </CardTitle>
                  <CardDescription>
                    Danh sách các buổi dạy và lịch trống
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : selectedDateEvents.length > 0 ? (
                    <div className="space-y-4">
                      {selectedDateEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{event.title}</h3>
                              <Badge
                                variant={
                                  event.type === "available"
                                    ? "outline"
                                    : "default"
                                }
                              >
                                {event.type === "available"
                                  ? "Lịch trống"
                                  : "Đã đặt"}
                              </Badge>
                            </div>
                            {event.student && (
                              <p className="text-sm text-muted-foreground">
                                Học sinh: {event.student}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <Badge variant="secondary">{event.time}</Badge>
                            {event.type === "available" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setScheduleToCancel(Number(event.id))
                                    }
                                  >
                                    Huỷ
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Xác nhận huỷ lịch
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Bạn có chắc chắn muốn huỷ lịch dạy này
                                      không? Hành động này không thể khôi phục.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel
                                      onClick={() => setScheduleToCancel(null)}
                                    >
                                      Không
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleCancelSchedule}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Huỷ lịch
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            {/* Thêm nút xóa cho lịch đã hủy */}
                            {event.type === "cancelled" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    Xóa
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Xác nhận xóa lịch
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Bạn có chắc chắn muốn xóa lịch này khỏi hệ
                                      thống? Sau khi xóa, bạn có thể tạo lịch
                                      mới vào khoảng thời gian này.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Không</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        deleteScheduleMutation.mutate(
                                          Number(event.id)
                                        )
                                      }
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Xóa lịch
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      Không có lịch dạy nào vào ngày này
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Dialog for creating new schedules with tabs */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Tạo lịch dạy mới</DialogTitle>
            <DialogDescription>
              Chọn loại lịch dạy bạn muốn tạo
            </DialogDescription>
          </DialogHeader>

          <Tabs
            defaultValue="single"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="single">Lịch trống một buổi</TabsTrigger>
              <TabsTrigger value="recurring">Tạo lịch định kỳ</TabsTrigger>
            </TabsList>
            {/* Single session form */}
            <TabsContent value="single" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Ngày
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="date"
                      type="date"
                      value={format(singleSessionForm.date, "yyyy-MM-dd")}
                      onChange={(e) =>
                        setSingleSessionForm({
                          ...singleSessionForm,
                          date: new Date(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="time" className="text-right">
                    Thời gian
                  </Label>
                  <div className="col-span-3 flex gap-2 items-center">
                    <Input
                      id="start-time"
                      type="time"
                      value={singleSessionForm.startTime}
                      onChange={(e) =>
                        setSingleSessionForm({
                          ...singleSessionForm,
                          startTime: e.target.value,
                        })
                      }
                    />
                    <span>-</span>
                    <Input
                      id="end-time"
                      type="time"
                      value={singleSessionForm.endTime}
                      onChange={(e) =>
                        setSingleSessionForm({
                          ...singleSessionForm,
                          endTime: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            {/* Recurring sessions form */}{" "}
            <TabsContent value="recurring" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Thời gian</Label>
                  <div className="col-span-3 grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="startDate" className="text-sm">
                        Từ ngày
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        className="mt-1"
                        value={format(
                          recurringSessionForm.startDate,
                          "yyyy-MM-dd"
                        )}
                        onChange={(e) =>
                          setRecurringSessionForm({
                            ...recurringSessionForm,
                            startDate: new Date(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate" className="text-sm">
                        Đến ngày
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        className="mt-1"
                        value={format(
                          recurringSessionForm.endDate,
                          "yyyy-MM-dd"
                        )}
                        onChange={(e) =>
                          setRecurringSessionForm({
                            ...recurringSessionForm,
                            endDate: new Date(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>{" "}
                <div className="grid grid-cols-1 gap-4">
                  <div className="mb-2">
                    <h3 className="font-medium mb-2">
                      Khung giờ dạy theo ngày trong tuần
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Chọn ngày và thiết lập khung giờ cho mỗi ngày
                    </p>
                  </div>

                  {/* Day selection section - arranged in a compact grid */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-3">
                      Chọn ngày trong tuần
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {[
                        { key: "monday", label: "Thứ 2" },
                        { key: "tuesday", label: "Thứ 3" },
                        { key: "wednesday", label: "Thứ 4" },
                        { key: "thursday", label: "Thứ 5" },
                        { key: "friday", label: "Thứ 6" },
                        { key: "saturday", label: "Thứ 7" },
                        { key: "sunday", label: "Chủ nhật" },
                      ].map((day) => (
                        <div
                          key={day.key}
                          className={`rounded-lg border p-2 flex items-center space-x-2 cursor-pointer hover:bg-accent transition-colors ${
                            !!recurringSessionForm.schedule[day.key]?.length
                              ? "border-primary bg-accent/30"
                              : ""
                          }`}
                          onClick={() =>
                            handleDayToggle(
                              day.key,
                              !recurringSessionForm.schedule[day.key]?.length
                            )
                          }
                        >
                          <Checkbox
                            id={day.key}
                            checked={
                              !!recurringSessionForm.schedule[day.key]?.length
                            }
                            onCheckedChange={(checked) =>
                              handleDayToggle(day.key, !!checked)
                            }
                          />
                          <Label
                            htmlFor={day.key}
                            className="font-medium cursor-pointer w-full"
                          >
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time slots section with tabs for selected days */}
                  {Object.keys(recurringSessionForm.schedule).length > 0 && (
                    <div className="mt-4 border rounded-md p-3">
                      <h4 className="text-sm font-medium mb-3">
                        Thiết lập khung giờ
                      </h4>

                      {/* Tabs for selected days */}
                      <Tabs
                        defaultValue={
                          Object.keys(recurringSessionForm.schedule)[0]
                        }
                        className="w-full"
                      >
                        <TabsList className="mb-2 flex flex-wrap h-auto">
                          {Object.keys(recurringSessionForm.schedule).map(
                            (dayKey) => {
                              const dayInfo = [
                                { key: "monday", label: "Thứ 2" },
                                { key: "tuesday", label: "Thứ 3" },
                                { key: "wednesday", label: "Thứ 4" },
                                { key: "thursday", label: "Thứ 5" },
                                { key: "friday", label: "Thứ 6" },
                                { key: "saturday", label: "Thứ 7" },
                                { key: "sunday", label: "Chủ nhật" },
                              ].find((d) => d.key === dayKey);

                              return (
                                <TabsTrigger
                                  key={dayKey}
                                  value={dayKey}
                                  className="text-xs sm:text-sm px-2 py-1 sm:px-3"
                                >
                                  {dayInfo?.label || dayKey}
                                </TabsTrigger>
                              );
                            }
                          )}
                        </TabsList>

                        {/* Tab content for each day */}
                        {Object.keys(recurringSessionForm.schedule).map(
                          (dayKey) => (
                            <TabsContent
                              key={dayKey}
                              value={dayKey}
                              className="mt-0 pt-3 border-t"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="text-sm font-medium">
                                  Khung giờ cho{" "}
                                  {
                                    [
                                      { key: "monday", label: "Thứ 2" },
                                      { key: "tuesday", label: "Thứ 3" },
                                      { key: "wednesday", label: "Thứ 4" },
                                      { key: "thursday", label: "Thứ 5" },
                                      { key: "friday", label: "Thứ 6" },
                                      { key: "saturday", label: "Thứ 7" },
                                      { key: "sunday", label: "Chủ nhật" },
                                    ].find((d) => d.key === dayKey)?.label
                                  }
                                </h5>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addTimeSlotForDay(dayKey)}
                                  className="h-7 px-2 text-xs"
                                >
                                  + Thêm giờ
                                </Button>
                              </div>

                              <div className="space-y-2">
                                {recurringSessionForm.schedule[dayKey].map(
                                  (slot, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-2 flex-wrap sm:flex-nowrap"
                                    >
                                      <div className="flex-1 flex items-center gap-1 min-w-[180px]">
                                        <Input
                                          type="time"
                                          value={slot.startTime}
                                          onChange={(e) =>
                                            updateTimeSlotForDay(
                                              dayKey,
                                              index,
                                              "startTime",
                                              e.target.value
                                            )
                                          }
                                          className="flex-1"
                                        />
                                        <span className="mx-1">-</span>
                                        <Input
                                          type="time"
                                          value={slot.endTime}
                                          onChange={(e) =>
                                            updateTimeSlotForDay(
                                              dayKey,
                                              index,
                                              "endTime",
                                              e.target.value
                                            )
                                          }
                                          className="flex-1"
                                        />
                                      </div>
                                      {recurringSessionForm.schedule[dayKey]
                                        .length > 1 && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            removeTimeSlotForDay(dayKey, index)
                                          }
                                          className="px-2 h-8 shrink-0"
                                        >
                                          ✕
                                        </Button>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </TabsContent>
                          )
                        )}
                      </Tabs>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={
                activeTab === "single"
                  ? handleSingleSessionSubmit
                  : handleRecurringSessionSubmit
              }
              disabled={
                createSingleSessionMutation.isPending ||
                createRecurringSessionsMutation.isPending
              }
            >
              {(createSingleSessionMutation.isPending ||
                createRecurringSessionsMutation.isPending) && (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></span>
              )}
              Tạo lịch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
