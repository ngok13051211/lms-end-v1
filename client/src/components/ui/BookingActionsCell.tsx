import { useState } from "react";
import { useLocation } from "wouter";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Textarea } from "./textarea";
import {
  Eye,
  Calendar,
  Star,
  MoreVertical,
  XCircle,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface BookingActionsProps {
  booking: {
    id: number;
    status: string;
    student_id?: number;
    rejection_reason?: string;
    sessions?: {
      id: number;
      status: string;
      sessionNote?: {
        student_rating?: number | null;
      };
    }[];
  };
  refetchBookings?: () => void; // Function to refetch the booking list
  tutorActions?: boolean; // Whether to show tutor-specific actions
  onFeedback?: (sessionId: number) => void; // Callback for feedback action
}

export function BookingActionsCell({
  booking,
  refetchBookings,
  tutorActions = false,
  onFeedback,
}: BookingActionsProps) {
  const [, setLocation] = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check if the current user is a tutor
  const isTutor = user?.role === "tutor";

  // Check if a completed booking has been rated
  const hasRated =
    booking.status === "completed" &&
    booking.sessions?.some(
      (session) =>
        session.sessionNote?.student_rating !== undefined &&
        session.sessionNote?.student_rating !== null
    );

  // Handle cancel booking
  const handleCancelBooking = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest(
        "PATCH",
        `/api/v1/bookings/${booking.id}/status`,
        { status: "cancelled" }
      );

      if (response.ok) {
        toast({
          title: "Thành công",
          description: `Đã hủy yêu cầu đặt lịch #${booking.id}`,
          variant: "default",
        });

        // Refetch the booking list if refetchBookings function is provided
        if (refetchBookings) {
          refetchBookings();
        }
        setShowCancelDialog(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Không thể hủy yêu cầu đặt lịch");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast({
        title: "Lỗi",
        description:
          error instanceof Error
            ? error.message
            : "Không thể hủy yêu cầu đặt lịch",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }; // Handle view booking details
  const handleViewBooking = () => {
    // Use the correct route based on user role
    if (isTutor) {
      setLocation(`/dashboard/tutor/bookings/${booking.id}`);
    } else {
      setLocation(`/bookings/${booking.id}`);
    }
  };
  // Handle view schedule
  const handleViewSchedule = () => {
    setLocation(`/bookings/${booking.id}/schedule`);
  };

  // Handle add rating
  const handleAddRating = () => {
    setLocation(`/bookings/${booking.id}/rate`);
  };

  // Handle confirm booking
  const handleConfirmBooking = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest(
        "PATCH",
        `/api/v1/bookings/${booking.id}/status`,
        { status: "confirmed" }
      );

      if (response.ok) {
        toast({
          title: "Thành công",
          description: `Đã xác nhận yêu cầu đặt lịch #${booking.id}`,
          variant: "default",
        });

        if (refetchBookings) {
          refetchBookings();
        }
        setShowConfirmDialog(false);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Không thể xác nhận yêu cầu đặt lịch"
        );
      }
    } catch (error) {
      console.error("Error confirming booking:", error);
      toast({
        title: "Lỗi",
        description:
          error instanceof Error
            ? error.message
            : "Không thể xác nhận yêu cầu đặt lịch",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reject booking
  const handleRejectBooking = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập lý do từ chối",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest(
        "PATCH",
        `/api/v1/bookings/${booking.id}/status`,
        {
          status: "rejected",
          rejection_reason: rejectionReason,
        }
      );

      if (response.ok) {
        toast({
          title: "Thành công",
          description: `Đã từ chối yêu cầu đặt lịch #${booking.id}`,
          variant: "default",
        });

        if (refetchBookings) {
          refetchBookings();
        }
        setShowRejectDialog(false);
        setRejectionReason("");
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Không thể từ chối yêu cầu đặt lịch"
        );
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
      toast({
        title: "Lỗi",
        description:
          error instanceof Error
            ? error.message
            : "Không thể từ chối yêu cầu đặt lịch",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // We've removed the renderActions function since we're using dropdown menu for all screen sizes
  // Render the dropdown actions menu for all screen sizes
  const renderActionsMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Mở menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Student actions */}
        {!tutorActions && booking.status === "pending" && (
          <>
            <DropdownMenuItem onClick={handleViewBooking}>
              <Eye className="h-4 w-4 mr-2" />
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowCancelDialog(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Hủy yêu cầu
            </DropdownMenuItem>
          </>
        )}
        {/* Tutor actions */}
        {tutorActions && booking.status === "pending" && (
          <>
            <DropdownMenuItem onClick={handleViewBooking}>
              <Eye className="h-4 w-4 mr-2" />
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowConfirmDialog(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Xác nhận
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowRejectDialog(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Từ chối
            </DropdownMenuItem>
          </>
        )}
        {booking.status === "confirmed" && (
          <DropdownMenuItem onClick={handleViewSchedule}>
            <Calendar className="h-4 w-4 mr-2" />
            Xem lịch học
          </DropdownMenuItem>
        )}{" "}
        {booking.status === "completed" && (
          <>
            <DropdownMenuItem onClick={handleViewBooking}>
              <Eye className="h-4 w-4 mr-2" />
              Xem chi tiết
            </DropdownMenuItem>
            {!tutorActions &&
              onFeedback &&
              booking.sessions?.some(
                (session) =>
                  session.status === "completed" &&
                  (!session.sessionNote || !session.sessionNote.student_rating)
              ) && (
                <DropdownMenuItem
                  onClick={() => {
                    // Tìm buổi học đầu tiên chưa có đánh giá
                    const sessionToRate = booking.sessions?.find(
                      (session) =>
                        session.status === "completed" &&
                        (!session.sessionNote ||
                          !session.sessionNote.student_rating)
                    );

                    if (sessionToRate && onFeedback) {
                      onFeedback(sessionToRate.id);
                    }
                  }}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Đánh giá
                </DropdownMenuItem>
              )}
          </>
        )}
        {(booking.status === "cancelled" || booking.status === "rejected") && (
          <DropdownMenuItem onClick={() => setShowReasonDialog(true)}>
            <AlertCircle className="h-4 w-4 mr-2" />
            Xem lý do
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return (
    <div className="flex items-center justify-end">
      {renderActionsMenu()}

      {/* Dialog for showing rejection/cancellation reason */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {booking.status === "cancelled" ? "Lý do hủy" : "Lý do từ chối"}
            </DialogTitle>
            <DialogDescription>
              {booking.rejection_reason ||
                "Không có thông tin chi tiết về lý do."}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận hủy yêu cầu</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn hủy yêu cầu đặt lịch học này? Hành động này
              không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isLoading}
            >
              Không, giữ lại
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Đang xử lý..." : "Đồng ý, hủy yêu cầu"}
            </Button>{" "}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Booking Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận đặt lịch</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xác nhận yêu cầu đặt lịch học này? Học viên
              sẽ được thông báo và phải thanh toán trong 24 giờ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLoading}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmBooking}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Đang xử lý..." : "Đồng ý, xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Booking Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do từ chối yêu cầu đặt lịch này. Học viên sẽ nhận
              được thông báo về lý do từ chối.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Nhập lý do từ chối..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isLoading}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectBooking}
              disabled={isLoading || !rejectionReason.trim()}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Đang xử lý..." : "Từ chối yêu cầu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
