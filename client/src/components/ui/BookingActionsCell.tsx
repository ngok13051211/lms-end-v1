import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  Eye,
  Calendar,
  Star,
  MoreVertical,
  XCircle,
  AlertCircle,
} from "lucide-react";

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
}

export function BookingActionsCell({ booking }: BookingActionsProps) {
  const [, setLocation] = useLocation();
  const [showReasonDialog, setShowReasonDialog] = useState(false);

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
    try {
      // In a real implementation, you would make an API call here
      // Example: await apiRequest.patch(`/api/v1/bookings/${booking.id}/status`, { status: "cancelled" });

      // For now, just show an alert and refresh the page
      alert(`Đã hủy yêu cầu đặt lịch #${booking.id}`);
      window.location.reload();
    } catch (error) {
      console.error("Error cancelling booking:", error);
    }
  };
  // Handle view booking details
  const handleViewBooking = () => {
    setLocation(`/bookings/${booking.id}`);
  };

  // Handle view schedule
  const handleViewSchedule = () => {
    setLocation(`/bookings/${booking.id}/schedule`);
  };

  // Handle add rating
  const handleAddRating = () => {
    setLocation(`/bookings/${booking.id}/rate`);
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
        {booking.status === "pending" && (
          <>
            <DropdownMenuItem onClick={handleViewBooking}>
              <Eye className="h-4 w-4 mr-2" />
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCancelBooking}>
              <XCircle className="h-4 w-4 mr-2" />
              Hủy yêu cầu
            </DropdownMenuItem>
          </>
        )}

        {booking.status === "confirmed" && (
          <DropdownMenuItem onClick={handleViewSchedule}>
            <Calendar className="h-4 w-4 mr-2" />
            Xem lịch học
          </DropdownMenuItem>
        )}

        {booking.status === "completed" && (
          <DropdownMenuItem
            onClick={hasRated ? handleViewBooking : handleAddRating}
          >
            {hasRated ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Xem chi tiết
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Đánh giá
              </>
            )}
          </DropdownMenuItem>
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
    </div>
  );
}
