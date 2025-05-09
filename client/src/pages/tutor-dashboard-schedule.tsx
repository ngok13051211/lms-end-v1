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
  mode: "online" | "offline";
  location?: string;
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
  location?: string;
  type: "available" | "booked";
  sessionType?: "online" | "offline";
}

interface CreateSingleSessionInput {
  date: Date;
  startTime: string;
  endTime: string;
  sessionType: "online" | "offline";
  location?: string;
}

interface CreateRecurringSessionInput {
  courseType: string;
  durationType: string;
  startDate: Date;
  endDate: Date;
  weekdays: string[];
  timeSlots: {
    startTime: string;
    endTime: string;
  }[];
  sessionType: "online" | "offline";
  location?: string;
}

// API function to create a single session schedule
const createSingleSession = async (data: CreateSingleSessionInput) => {
  const response = await fetch("/api/v1/schedules/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      date: format(data.date, "yyyy-MM-dd"),
      start_time: data.startTime,
      end_time: data.endTime,
      mode: data.sessionType,
      location: data.location,
      is_recurring: false,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create schedule");
  }

  return response.json();
};

// API function to create recurring sessions
const createRecurringSessions = async (data: CreateRecurringSessionInput) => {
  const response = await fetch("/api/v1/schedules/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start_date: format(data.startDate, "yyyy-MM-dd"),
      end_date: format(data.endDate, "yyyy-MM-dd"),
      repeat_days: data.weekdays,
      start_time: data.timeSlots[0].startTime,
      end_time: data.timeSlots[0].endTime,
      mode: data.sessionType,
      location: data.location,
      is_recurring: true,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create recurring schedule");
  }

  return response.json();
};

// API function to fetch tutor schedules
const fetchTutorSchedules = async () => {
  const response = await fetch("/api/v1/schedules/tutor", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    credentials: "include", // Đảm bảo cookies được gửi trong request
  });

  if (!response.ok) {
    throw new Error("Failed to fetch schedules");
  }

  return response.json();
};

// API function to cancel a schedule
const cancelSchedule = async (scheduleId: number) => {
  const response = await fetch(`/api/v1/schedules/${scheduleId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to cancel schedule");
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
      sessionType: "online",
      location: "",
    });

  // Recurring session form state
  const [recurringSessionForm, setRecurringSessionForm] =
    useState<CreateRecurringSessionInput>({
      courseType: "basic",
      durationType: "short",
      startDate: new Date(),
      endDate: addDays(new Date(), 30),
      weekdays: [],
      timeSlots: [{ startTime: "08:00", endTime: "10:00" }],
      sessionType: "online",
      location: "",
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
    onSuccess: () => {
      // Invalidate and refetch schedules query
      queryClient.invalidateQueries({ queryKey: ["tutorSchedules"] });
      setIsDialogOpen(false);
      toast({
        title: "Lịch đã được tạo",
        description: "Lịch trống của bạn đã được tạo thành công",
      });
    },
    onError: (error) => {
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
    onSuccess: () => {
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
    location: schedule.location,
    type: schedule.status === "available" ? "available" : "booked",
    sessionType: schedule.mode,
  }));

  // Filter events for selected date in calendar view
  const selectedDateEvents = calendarEvents.filter(
    (event) => date && isSameDay(event.date, date)
  );

  // Handle single session form submission
  const handleSingleSessionSubmit = () => {
    createSingleSessionMutation.mutate(singleSessionForm);
  };

  // Handle recurring session form submission
  const handleRecurringSessionSubmit = () => {
    createRecurringSessionsMutation.mutate(recurringSessionForm);
  };

  // Handle weekday selection for recurring sessions
  const handleWeekdayToggle = (day: string) => {
    setRecurringSessionForm((prev) => {
      if (prev.weekdays.includes(day)) {
        return {
          ...prev,
          weekdays: prev.weekdays.filter((d) => d !== day),
        };
      } else {
        return {
          ...prev,
          weekdays: [...prev.weekdays, day],
        };
      }
    });
  };

  // Add a new time slot for recurring sessions
  const addTimeSlot = () => {
    setRecurringSessionForm((prev) => ({
      ...prev,
      timeSlots: [...prev.timeSlots, { startTime: "08:00", endTime: "10:00" }],
    }));
  };

  // Remove a time slot
  const removeTimeSlot = (index: number) => {
    setRecurringSessionForm((prev) => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((_, i) => i !== index),
    }));
  };

  // Update a time slot
  const updateTimeSlot = (
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setRecurringSessionForm((prev) => ({
      ...prev,
      timeSlots: prev.timeSlots.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ),
    }));
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
                        <TableHead>Hình thức</TableHead>
                        <TableHead>Khóa học</TableHead>
                        <TableHead>Địa điểm</TableHead>
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
                          <TableCell>
                            <Badge variant="outline">
                              {schedule.mode === "online"
                                ? "Online"
                                : "Offline"}
                            </Badge>
                          </TableCell>
                          <TableCell>{schedule.course?.title || "-"}</TableCell>
                          <TableCell>{schedule.location || "-"}</TableCell>
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
                                      Hình thức
                                    </Label>
                                    <div className="col-span-3">
                                      {schedule.mode === "online"
                                        ? "Online"
                                        : "Offline"}
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
                                      Địa điểm
                                    </Label>
                                    <div className="col-span-3">
                                      {schedule.location || "-"}
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
                              <Badge variant="outline">
                                {event.sessionType === "online"
                                  ? "Online"
                                  : "Offline"}
                              </Badge>
                            </div>
                            {event.student && (
                              <p className="text-sm text-muted-foreground">
                                Học sinh: {event.student}
                              </p>
                            )}
                            {event.location && (
                              <p className="text-sm text-muted-foreground">
                                Địa điểm: {event.location}
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

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Hình thức học</Label>
                  <RadioGroup
                    className="col-span-3"
                    value={singleSessionForm.sessionType}
                    onValueChange={(value) =>
                      setSingleSessionForm({
                        ...singleSessionForm,
                        sessionType: value as "online" | "offline",
                      })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="online" id="online" />
                      <Label htmlFor="online">Online</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="offline" id="offline" />
                      <Label htmlFor="offline">Offline</Label>
                    </div>
                  </RadioGroup>
                </div>

                {singleSessionForm.sessionType === "offline" && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="location" className="text-right">
                      Địa điểm
                    </Label>
                    <Input
                      id="location"
                      className="col-span-3"
                      placeholder="Nhập địa điểm dạy học"
                      value={singleSessionForm.location || ""}
                      onChange={(e) =>
                        setSingleSessionForm({
                          ...singleSessionForm,
                          location: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Recurring sessions form */}
            <TabsContent value="recurring" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="courseType" className="text-right">
                    Khóa học
                  </Label>
                  <Select
                    value={recurringSessionForm.courseType}
                    onValueChange={(value) =>
                      setRecurringSessionForm({
                        ...recurringSessionForm,
                        courseType: value,
                      })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Cơ bản</SelectItem>
                      <SelectItem value="advanced">Nâng cao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="durationType" className="text-right">
                    Thời lượng
                  </Label>
                  <Select
                    value={recurringSessionForm.durationType}
                    onValueChange={(value) =>
                      setRecurringSessionForm({
                        ...recurringSessionForm,
                        durationType: value,
                      })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Ngắn hạn</SelectItem>
                      <SelectItem value="long">Dài hạn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Các ngày trong tuần</Label>
                  <div className="col-span-3 flex flex-wrap gap-2">
                    {[
                      "monday",
                      "tuesday",
                      "wednesday",
                      "thursday",
                      "friday",
                      "saturday",
                      "sunday",
                    ].map((day, index) => {
                      const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
                      return (
                        <div key={day} className="flex items-center space-x-2">
                          <Checkbox
                            id={day}
                            checked={recurringSessionForm.weekdays.includes(
                              day
                            )}
                            onCheckedChange={() => handleWeekdayToggle(day)}
                          />
                          <Label htmlFor={day}>{days[index]}</Label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Khung giờ dạy</Label>
                  <div className="col-span-3 space-y-3">
                    {recurringSessionForm.timeSlots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) =>
                            updateTimeSlot(index, "startTime", e.target.value)
                          }
                        />
                        <span>-</span>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) =>
                            updateTimeSlot(index, "endTime", e.target.value)
                          }
                        />
                        {recurringSessionForm.timeSlots.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTimeSlot(index)}
                            className="px-2 h-8"
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addTimeSlot}
                      className="mt-2"
                    >
                      + Thêm khung giờ
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Hình thức học</Label>
                  <RadioGroup
                    className="col-span-3"
                    value={recurringSessionForm.sessionType}
                    onValueChange={(value) =>
                      setRecurringSessionForm({
                        ...recurringSessionForm,
                        sessionType: value as "online" | "offline",
                      })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="online" id="recurring-online" />
                      <Label htmlFor="recurring-online">Online</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="offline" id="recurring-offline" />
                      <Label htmlFor="recurring-offline">Offline</Label>
                    </div>
                  </RadioGroup>
                </div>

                {recurringSessionForm.sessionType === "offline" && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="recurringLocation" className="text-right">
                      Địa điểm
                    </Label>
                    <Input
                      id="recurringLocation"
                      className="col-span-3"
                      placeholder="Nhập địa điểm dạy học"
                      value={recurringSessionForm.location || ""}
                      onChange={(e) =>
                        setRecurringSessionForm({
                          ...recurringSessionForm,
                          location: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
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
