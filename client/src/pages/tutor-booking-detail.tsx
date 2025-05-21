import { useSelector } from "react-redux";
import { useParams, Link } from "wouter";
import { RootState } from "@/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Globe,
  Calendar,
  Clock,
  Mail,
  Phone,
  User,
  Info,
} from "lucide-react";
import {
  BookingSession,
  useBookingDetailsQuery,
} from "@/hooks/useBookingDetailsQuery";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";

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

// Helper function to get status badge
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

// Helper function to generate avatar initials from name
const getInitials = (firstName: string, lastName: string) => {
  return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`;
};

export default function TutorBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, isLoading, error } = useBookingDetailsQuery(id);
  const { user } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center mb-6">
            <Button variant="ghost" className="mr-4" asChild>
              <Link to="/dashboard/tutor/bookings">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="py-10">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <p className="text-center mt-4 text-gray-500">
                Đang tải thông tin chi tiết...
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !booking) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center mb-6">
            <Button variant="ghost" className="mr-4" asChild>
              <Link to="/dashboard/tutor/bookings">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="py-10">
              <div className="flex justify-center text-red-500">
                <Info className="h-12 w-12" />
              </div>
              <p className="text-center mt-4 text-red-500 font-medium">
                Đã xảy ra lỗi khi tải thông tin chi tiết
              </p>
              <p className="text-center mt-2 text-gray-500">
                Vui lòng thử lại sau
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" className="mr-4" asChild>
              <Link to="/dashboard/tutor/bookings">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Link>
            </Button>
            <h1 className="text-2xl font-medium">Chi tiết đặt lịch</h1>
          </div>
          <div>{getStatusBadge(booking.status)}</div>
        </div>

        {/* Main booking information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Left column - Booking details */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{booking.title}</CardTitle>
              <CardDescription>
                {booking.course
                  ? `Khóa học: ${booking.course.title}`
                  : "Đặt lịch học trực tiếp"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Basic booking info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Số buổi học
                    </h3>
                    <p>{booking.sessions.length} buổi</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Tổng số giờ
                    </h3>
                    <p>{booking.total_hours} giờ</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Giá mỗi giờ
                    </h3>
                    <p>{formatCurrency(booking.hourly_rate)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Tổng tiền
                    </h3>
                    <p className="font-medium text-primary">
                      {formatCurrency(booking.total_amount)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Ngày đặt
                    </h3>
                    <p>{formatDate(booking.created_at)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Hình thức
                    </h3>
                    <div className="flex items-center">
                      {booking.mode === "online" ? (
                        <>
                          <Globe className="h-4 w-4 mr-1 text-blue-500" />
                          <span>Trực tuyến</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 mr-1 text-red-500" />
                          <span>Tại địa điểm</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location or URL */}
                {booking.mode === "offline" && booking.location && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Địa điểm học
                      </h3>
                      <p className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2 mt-1 text-red-500" />
                        <span>{booking.location}</span>
                      </p>
                    </div>
                  </>
                )}

                {booking.mode === "online" && booking.meeting_url && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Liên kết học trực tuyến
                      </h3>
                      <p className="flex items-center">
                        <Globe className="h-4 w-4 mr-2 text-blue-500" />
                        <a
                          href={booking.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {booking.meeting_url}
                        </a>
                      </p>
                    </div>
                  </>
                )}

                {/* Additional notes */}
                {booking.note && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Ghi chú từ học viên
                      </h3>
                      <p className="text-gray-700">{booking.note}</p>
                    </div>
                  </>
                )}

                {/* Session listing */}
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-4">Lịch buổi học</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ngày</TableHead>
                          <TableHead>Thời gian</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Ghi chú</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {booking.sessions.map((session: BookingSession) => (
                          <TableRow key={session.id}>
                            <TableCell>{formatDate(session.date)}</TableCell>
                            <TableCell>
                              {formatTime(session.start_time)} -{" "}
                              {formatTime(session.end_time)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(session.status)}
                            </TableCell>
                            <TableCell>
                              {session.sessionNote && (
                                <>
                                  {session.sessionNote.student_feedback && (
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">
                                        Phản hồi học viên:
                                      </span>{" "}
                                      {session.sessionNote.student_feedback}
                                    </p>
                                  )}
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right column - Student info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Thông tin học viên</CardTitle>
              </CardHeader>
              <CardContent>
                {booking.student ? (
                  <div className="space-y-4">
                    {" "}
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10">
                        {" "}
                        <AvatarImage
                          src={booking.student?.avatar || undefined}
                          alt={`${booking.student?.first_name || ""} ${
                            booking.student?.last_name || ""
                          }`}
                        />
                        <AvatarFallback>
                          {getInitials(
                            booking.student?.first_name || "",
                            booking.student?.last_name || ""
                          )}
                        </AvatarFallback>
                      </Avatar>{" "}
                      <div className="ml-4">
                        <p className="font-medium">
                          {booking.student?.first_name || "Không có tên"}{" "}
                          {booking.student?.last_name || ""}
                        </p>
                      </div>
                    </div>
                    <Separator />{" "}
                    {booking.student?.email && (
                      <div className="flex items-start">
                        <Mail className="h-4 w-4 mr-2 mt-0.5 text-gray-500" />
                        <div>
                          {" "}
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p>{booking.student?.email}</p>
                        </div>
                      </div>
                    )}{" "}
                    {booking.student?.phone && (
                      <div className="flex items-start">
                        <Phone className="h-4 w-4 mr-2 mt-0.5 text-gray-500" />
                        <div>
                          {" "}
                          <p className="text-sm text-muted-foreground">
                            Số điện thoại
                          </p>
                          <p>{booking.student?.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <User className="h-10 w-10 mx-auto text-gray-400" />
                    <p className="mt-2 text-muted-foreground">
                      Không có thông tin học viên
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment info */}
            {booking.payment && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Thông tin thanh toán
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Phương thức thanh toán
                      </p>
                      <p className="font-medium">
                        {booking.payment.payment_method}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Trạng thái
                      </p>
                      <div>
                        {booking.payment.status === "completed" ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200">
                            Đã thanh toán
                          </Badge>
                        ) : booking.payment.status === "pending" ? (
                          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Chờ thanh toán
                          </Badge>
                        ) : (
                          <Badge className="bg-red-50 text-red-700 border-red-200">
                            Chưa thanh toán
                          </Badge>
                        )}
                      </div>
                    </div>
                    {booking.payment.payment_date && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Ngày thanh toán
                        </p>
                        <p>{formatDate(booking.payment.payment_date)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
