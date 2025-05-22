// filepath: d:\Downloads\HomiTutorPlatform\client\src\pages\student-dashboard-bookings.tsx
import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { CalendarClock, Info, Loader2, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BookingActionsCell } from "@/components/ui/BookingActionsCell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import useStudentBookingsQuery from "@/hooks/useStudentBookingsQuery";

// Status options for filtering bookings
const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "rejected", label: "Từ chối" },
];

// Hàm chuyển đổi trạng thái thành nhãn hiển thị
const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className="bg-yellow-50 text-yellow-700 border-yellow-200"
        >
          Chờ xác nhận
        </Badge>
      );
    case "confirmed":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          Đã xác nhận
        </Badge>
      );
    case "completed":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200"
        >
          Hoàn thành
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className="bg-gray-50 text-gray-700 border-gray-200"
        >
          Đã hủy
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200"
        >
          Từ chối
        </Badge>
      );
    default:
      return <Badge variant="outline">Không xác định</Badge>;
  }
};

// Hàm định dạng số tiền thành chuỗi có dấu phân cách
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// Hàm định dạng ngày tháng
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("vi-VN");
};

export default function StudentDashboardBookings() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "completed" | "cancelled" | "rejected"
  >("all");

  // State cho dialog đánh giá buổi học
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null
  );
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const { toast } = useToast();

  // Fetch bookings data using the custom hook
  const {
    data: bookings,
    isLoading,
    error,
    refetch,
  } = useStudentBookingsQuery({ status: statusFilter });

  // Lọc danh sách bookings theo từ khóa tìm kiếm
  const filteredBookings = bookings
    ? bookings.filter(
        (booking) =>
          booking.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (booking.tutor.user.first_name + " " + booking.tutor.user.last_name)
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          booking.status.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Hàm mở dialog đánh giá buổi học
  const openFeedbackDialog = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setRating(5);
    setFeedback("");
    setIsDialogOpen(true);
  };

  // Hàm xử lý gửi đánh giá
  const submitFeedback = async () => {
    if (!selectedSessionId) return;

    setIsSubmittingFeedback(true);

    try {
      await apiRequest(
        "POST",
        `/api/v1/bookings/sessions/${selectedSessionId}/notes`,
        {
          student_rating: rating,
          student_feedback: feedback,
        }
      );

      // Đóng dialog và tải lại dữ liệu
      setIsDialogOpen(false);
      await refetch();

      toast({
        title: "Thành công",
        description: "Đã gửi đánh giá và góp ý cho buổi học.",
        variant: "success",
      });
    } catch (err) {
      console.error("Error submitting feedback:", err);
      toast({
        title: "Lỗi",
        description: "Không thể gửi đánh giá và góp ý. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium">
            Danh sách yêu cầu đặt lịch học
          </h1>
          <div className="flex gap-2">
            <Link href="/dashboard/student/profile">
              <Button variant="outline">Hồ sơ</Button>
            </Link>
            <Link href="/dashboard/student/tutors">
              <Button variant="outline">Gia sư yêu thích</Button>
            </Link>
          </div>
        </div>{" "}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên khóa học, gia sư hoặc trạng thái..."
                  className="pl-8 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full md:w-64">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lọc theo trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Yêu cầu đặt lịch học của bạn</CardTitle>
            <CardDescription>
              Danh sách các yêu cầu đặt lịch học của bạn và trạng thái hiện tại
            </CardDescription>
          </CardHeader>{" "}
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
                <h2 className="mt-4 text-xl font-medium">
                  Đang tải dữ liệu...
                </h2>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <Info className="h-12 w-12 mx-auto text-red-500" />
                <h2 className="mt-4 text-xl font-medium text-red-500">
                  Đã xảy ra lỗi
                </h2>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  Không thể tải danh sách yêu cầu đặt lịch. Vui lòng thử lại
                  sau.
                </p>
                <Button
                  className="mt-6"
                  onClick={() => refetch()}
                  variant="outline"
                >
                  Thử lại
                </Button>
              </div>
            ) : filteredBookings.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Khóa học</TableHead>
                      <TableHead>Gia sư</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead>Số buổi</TableHead>
                      <TableHead>Tổng tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.title}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={booking.tutor.user.avatar || undefined}
                                alt={`${booking.tutor.user.first_name} ${booking.tutor.user.last_name}`}
                              />
                              <AvatarFallback className="text-xs">
                                {booking.tutor.user.first_name.charAt(0)}
                                {booking.tutor.user.last_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>
                              {booking.tutor.user.first_name}{" "}
                              {booking.tutor.user.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(booking.created_at)}</TableCell>
                        <TableCell>{booking.sessions.length} buổi</TableCell>
                        <TableCell>
                          {formatCurrency(parseFloat(booking.total_amount))}
                        </TableCell>{" "}
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>{" "}
                        <TableCell className="text-right">
                          <BookingActionsCell
                            booking={booking}
                            refetchBookings={refetch}
                            onFeedback={(sessionId) =>
                              openFeedbackDialog(sessionId)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : searchQuery ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="mt-4 text-xl font-medium">
                  Không tìm thấy kết quả
                </h2>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  Không tìm thấy yêu cầu đặt lịch nào phù hợp với từ khóa "
                  {searchQuery}". Hãy thử tìm kiếm với từ khóa khác.
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="mt-4 text-xl font-medium">
                  Bạn chưa có yêu cầu đặt lịch nào
                </h2>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  Bạn chưa tạo yêu cầu đặt lịch học với gia sư nào. Hãy tìm kiếm
                  gia sư và đặt lịch học ngay!
                </p>
                <Button
                  className="mt-6"
                  onClick={() => (window.location.href = "/tutors")}
                >
                  Tìm gia sư
                </Button>
              </div>
            )}{" "}
          </CardContent>
        </Card>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Đánh giá buổi học</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Đánh giá của bạn</div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-5 w-5 cursor-pointer transition-all",
                      i < rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                    onClick={() => setRating(i + 1)}
                  />
                ))}
              </div>
            </div>
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Góp ý của bạn</div>
              <Textarea
                placeholder="Chia sẻ trải nghiệm của bạn về buổi học này..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy bỏ
            </Button>
            <Button onClick={submitFeedback} disabled={isSubmittingFeedback}>
              {isSubmittingFeedback ? "Đang gửi..." : "Gửi đánh giá"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
