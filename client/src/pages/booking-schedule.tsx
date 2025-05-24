import { useState } from "react";
import { useSelector } from "react-redux";
import { useParams, useLocation } from "wouter";
import { RootState } from "@/store";
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
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  Star,
  CheckCircle2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookingSession,
  useBookingDetailsQuery,
} from "@/hooks/useBookingDetailsQuery";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// Helper function to format currency
const formatCurrency = (amount: string) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(parseFloat(amount));
};

// Helper function to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("vi-VN");
};

// Helper function to format time
const formatTime = (timeString: string) => {
  return timeString.substring(0, 5); // Format HH:MM from HH:MM:SS
};

// Helper function to get session status badge
const getSessionStatusBadge = (status: string) => {
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
          Đã hoàn thành
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200"
        >
          Đã hủy
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Helper function to get booking status badge
const getBookingStatusBadge = (status: string) => {
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
          Đã hoàn thành
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200"
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
          Đã từ chối
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function BookingSchedule() {
  const { id } = useParams();
  const { user } = useSelector((state: RootState) => state.auth);
  const {
    data: booking,
    isLoading,
    isError,
    error,
    refetch,
  } = useBookingDetailsQuery(id);
  const isTutor = user?.role === "tutor";
  const isStudent = user?.role === "student";
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // State for the feedback dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null
  );
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Function to mark a session as completed
  const markSessionAsCompleted = async (sessionId: number) => {
    try {
      await apiRequest(
        "PATCH",
        `/api/v1/bookings/sessions/${sessionId}/status`,
        {
          status: "completed",
        }
      );

      // Refetch the booking data to update the UI
      await refetch();

      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái buổi học thành hoàn thành.",
        variant: "default",
      });
    } catch (err) {
      console.error("Error updating session status:", err);
      toast({
        title: "Lỗi",
        description:
          "Không thể cập nhật trạng thái buổi học. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  };

  // Function to open the feedback dialog
  const openFeedbackDialog = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setRating(5);
    setFeedback("");
    setIsDialogOpen(true);
  };

  // Function to submit feedback
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

      // Close the dialog and refetch the booking data
      setIsDialogOpen(false);
      await refetch();

      toast({
        title: "Thành công",
        description: "Đã gửi đánh giá và góp ý cho buổi học.",
        variant: "default",
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-4">
          <Card>
            <CardContent className="flex items-center justify-center p-10">
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary"></div>
                <span>Đang tải...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !booking) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-4">
          <Card>
            <CardContent className="flex items-center justify-center p-10">
              <div className="flex flex-col items-center gap-2 text-red-600">
                <span>
                  Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.
                </span>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/bookings")}
                >
                  Quay lại danh sách
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate session statistics
  const totalSessions = booking.sessions.length;
  const completedSessions = booking.sessions.filter(
    (session) => session.status === "completed"
  ).length;
  const pendingSessions = booking.sessions.filter(
    (session) => session.status === "pending"
  ).length;
  const confirmedSessions = booking.sessions.filter(
    (session) => session.status === "confirmed"
  ).length;
  const cancelledSessions = booking.sessions.filter(
    (session) => session.status === "cancelled"
  ).length;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        {/* Header Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Tiến trình khóa học</CardTitle>
                <CardDescription>{booking.title}</CardDescription>
              </div>
              <div>{getBookingStatusBadge(booking.status)}</div>
            </div>
          </CardHeader>
        </Card>

        {/* Booking Info Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Thông tin khóa học</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Ngày bắt đầu:
                  </span>
                  <span className="font-medium">
                    {booking.sessions.length > 0
                      ? formatDate(booking.sessions[0].date)
                      : "Chưa có lịch học"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Tổng số giờ:
                  </span>
                  <span className="font-medium">{booking.total_hours} giờ</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Tổng số buổi:
                  </span>
                  <span className="font-medium">{totalSessions} buổi</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Học phí:
                  </span>
                  <span className="font-medium">
                    {formatCurrency(booking.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-green-700 font-semibold text-lg">
                  {completedSessions}
                </div>
                <div className="text-xs text-muted-foreground">
                  Đã hoàn thành
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-blue-700 font-semibold text-lg">
                  {confirmedSessions}
                </div>
                <div className="text-xs text-muted-foreground">Đã xác nhận</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-yellow-700 font-semibold text-lg">
                  {pendingSessions}
                </div>
                <div className="text-xs text-muted-foreground">
                  Chờ xác nhận
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-red-700 font-semibold text-lg">
                  {cancelledSessions}
                </div>
                <div className="text-xs text-muted-foreground">Đã hủy</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch học chi tiết</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>STT</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {booking.sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Chưa có lịch học nào được tạo
                    </TableCell>
                  </TableRow>
                ) : (
                  booking.sessions.map((session, index) => {
                    const sessionDate = new Date(session.date);
                    const sessionEndDateTime = new Date(
                      `${session.date}T${session.end_time}`
                    );
                    const isPastSession = sessionEndDateTime < new Date(); // true

                    const needsCompletionMark =
                      isPastSession &&
                      session.status !== "completed" &&
                      session.status !== "cancelled";

                    const needsFeedback =
                      isStudent &&
                      session.status === "completed" &&
                      (!session.sessionNote ||
                        !session.sessionNote.student_feedback);

                    return (
                      <TableRow key={session.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{formatDate(session.date)}</TableCell>
                        <TableCell>
                          {formatTime(session.start_time)} -{" "}
                          {formatTime(session.end_time)}
                        </TableCell>
                        <TableCell>
                          {getSessionStatusBadge(session.status)}
                        </TableCell>
                        <TableCell>
                          {session.sessionNote ? (
                            <div className="text-sm">
                              {session.sessionNote.student_feedback && (
                                <div className="flex items-center gap-1">
                                  <span>Đánh giá: </span>
                                  <div className="flex items-center">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={cn(
                                          "h-3 w-3",
                                          i <
                                            (session.sessionNote
                                              ?.student_rating || 0)
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-gray-300"
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {session.sessionNote.student_feedback && (
                                <div className="mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    Góp ý:{" "}
                                  </span>
                                  <span className="text-xs">
                                    {session.sessionNote.student_feedback}
                                  </span>
                                </div>
                              )}
                              {session.sessionNote.tutor_notes && (
                                <div className="mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    Ghi chú:{" "}
                                  </span>
                                  <span className="text-xs">
                                    {session.sessionNote.tutor_notes}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Chưa có ghi chú
                            </span>
                          )}
                        </TableCell>{" "}
                        <TableCell className="text-right">
                          {(isTutor || isStudent) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {isTutor && needsCompletionMark && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      markSessionAsCompleted(session.id)
                                    }
                                    className="text-green-600"
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />✅
                                    Hoàn thành
                                  </DropdownMenuItem>
                                )}
                                {needsFeedback && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openFeedbackDialog(session.id)
                                    }
                                    className="text-amber-600"
                                  >
                                    <Star className="mr-2 h-4 w-4" />⭐ Góp ý
                                  </DropdownMenuItem>
                                )}
                                {!(
                                  (isTutor && needsCompletionMark) ||
                                  needsFeedback
                                ) && (
                                  <DropdownMenuItem
                                    disabled
                                    className="text-muted-foreground"
                                  >
                                    Không có hành động khả dụng
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
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
              <div className="text-sm font-medium mb-2">Đánh giá của bạn</div>
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
