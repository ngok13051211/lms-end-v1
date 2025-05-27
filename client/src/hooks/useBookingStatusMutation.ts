import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UpdateBookingStatusParams {
  bookingId: number;
  status: "confirmed" | "rejected";
}

interface UpdateBookingStatusResponse {
  message: string;
  booking: any;
}

/**
 * Custom hook for updating booking status (confirm/reject)
 * Used by tutors to accept or reject booking requests
 */
export function useBookingStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation<UpdateBookingStatusResponse, Error, UpdateBookingStatusParams>({
    mutationFn: async ({ bookingId, status }) => {
      const response = await apiRequest("PATCH", `/api/v1/bookings/${bookingId}/status`, {
        status,
      });
      return response.json();
    },    onSuccess: async (data, variables) => {
      // Update the cache directly for immediate UI feedback
      queryClient.setQueryData(
        ["booking", variables.bookingId.toString()],
        (oldData: any) => {
          if (oldData) {
            return {
              ...oldData,
              status: variables.status,
              updated_at: new Date().toISOString(),
            };
          }
          return oldData;
        }
      );

      // Force refetch booking details to ensure fresh data
      await queryClient.refetchQueries({
        queryKey: ["booking", variables.bookingId.toString()],
        exact: true,
      });

      // Invalidate and refetch tutor bookings list
      await queryClient.refetchQueries({
        queryKey: ["tutorBookings"],
      });
    },
    onError: (error) => {
      console.error("Error updating booking status:", error);
    },
  });
}

export default useBookingStatusMutation;
