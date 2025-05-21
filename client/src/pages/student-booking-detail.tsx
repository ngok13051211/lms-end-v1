import { useState } from "react";
import { useSelector } from "react-redux";
import { useParams, Link } from "wouter";
import { RootState } from "@/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
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
  return `${firstName.charAt(0)}${lastName.charAt(0)}`;
};

export default function StudentBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, isLoading, error } = useBookingDetailsQuery(id);
  const { user } = useSelector((state: RootState) => state.auth);

  // Handle rating display
  const renderStarRating = (rating: number | undefined) => {
    if (!rating) return null;

    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={cn(
              "h-4 w-4",
              i < rating
                ? "text-yellow-500 fill-yellow-500"
                : "text-gray-300 fill-gray-300"
            )}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
          </svg>
        ))}
        <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center mb-6">
            <Button variant="ghost" className="mr-4" asChild>
              <Link to="/dashboard/student/bookings">
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
              <Link to="/dashboard/student/bookings">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="py-10">
              <div className="flex justify-center text-red-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-12 w-12"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
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
              <Link to="/dashboard/student/bookings">
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
                {booking.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Mô tả:
                    </h3>
                    <p>{booking.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Tổng số giờ:
                    </h3>
                    <p>{booking.total_hours} giờ</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Tổng tiền:
                    </h3>
                    <p className="font-medium text-primary">
                      {formatCurrency(booking.total_amount)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Hình thức học:
                  </h3>
                  <div className="flex items-center">
                    {booking.mode === "online" ? (
                      <>
                        <Globe className="h-4 w-4 mr-2 text-blue-500" />
                        <span>Trực tuyến</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2 text-orange-500" />
                        <span>Trực tiếp</span>
                      </>
                    )}
                  </div>
                </div>

                {booking.mode === "online" && booking.meeting_url && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Đường dẫn học trực tuyến:
                    </h3>
                    <a
                      href={booking.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {booking.meeting_url}
                    </a>
                  </div>
                )}

                {booking.mode === "offline" && booking.location && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Địa điểm học:
                    </h3>
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 text-gray-400" />
                      <span>{booking.location}</span>
                    </div>
                  </div>
                )}

                {booking.note && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Ghi chú:
                    </h3>
                    <p className="text-gray-700">{booking.note}</p>
                  </div>
                )}

                {booking.rejection_reason && (
                  <div className="bg-red-50 p-3 rounded-md border border-red-100">
                    <h3 className="text-sm font-medium text-red-800 mb-1">
                      Lý do từ chối:
                    </h3>
                    <p className="text-red-700">{booking.rejection_reason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right column - Tutor information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin gia sư</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center mb-4">
                <Avatar className="h-12 w-12 mr-4">
                  <AvatarImage src={booking.tutor.user.avatar || undefined} />
                  <AvatarFallback>
                    {getInitials(
                      booking.tutor.user.first_name,
                      booking.tutor.user.last_name
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">
                    {booking.tutor.user.first_name}{" "}
                    {booking.tutor.user.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">Gia sư</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-3 text-gray-400" />
                  <span className="text-sm">{booking.tutor.user.email}</span>
                </div>
                {booking.tutor.user.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-3 text-gray-400" />
                    <span className="text-sm">{booking.tutor.user.phone}</span>
                  </div>
                )}
              </div>{" "}
              {booking.course && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Thông tin khóa học
                    </h3>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="text-gray-500">Môn học:</span>{" "}
                        {booking.course.subject?.name || "Chưa có thông tin"}
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-500">Cấp độ:</span>{" "}
                        {booking.course.level || "Chưa có thông tin"}
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-500">Học phí/giờ:</span>{" "}
                        {booking.course.hourly_rate
                          ? formatCurrency(booking.course.hourly_rate)
                          : "Chưa có thông tin"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sessions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Các buổi học</CardTitle>
            <CardDescription>
              {booking.sessions.length} buổi học - {booking.total_hours} giờ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày học</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {booking.sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDate(session.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        {formatTime(session.start_time)} -{" "}
                        {formatTime(session.end_time)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>
                      {session.sessionNote && (
                        <div className="space-y-2">
                          {session.sessionNote.tutor_notes && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">
                                Ghi chú gia sư:
                              </span>
                              <p className="text-sm">
                                {session.sessionNote.tutor_notes}
                              </p>
                            </div>
                          )}
                          {session.sessionNote.student_feedback && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">
                                Phản hồi của bạn:
                              </span>
                              <p className="text-sm">
                                {session.sessionNote.student_feedback}
                              </p>
                            </div>
                          )}
                          {session.sessionNote.student_rating && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">
                                Đánh giá của bạn:
                              </span>
                              {renderStarRating(
                                session.sessionNote.student_rating
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payment Information if available */}
        {booking.payment && (
          <Card>
            <CardHeader>
              <CardTitle>Thông tin thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Số tiền:
                  </h3>
                  <p className="font-medium">
                    {formatCurrency(booking.payment.amount)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Phương thức:
                  </h3>
                  <p>{booking.payment.payment_method}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Trạng thái:
                  </h3>
                  <Badge
                    variant="outline"
                    className={
                      booking.payment.status === "paid"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                    }
                  >
                    {booking.payment.status === "paid"
                      ? "Đã thanh toán"
                      : "Chưa thanh toán"}
                  </Badge>
                </div>
                {booking.payment.payment_date && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Ngày thanh toán:
                    </h3>
                    <p>{formatDate(booking.payment.payment_date)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
