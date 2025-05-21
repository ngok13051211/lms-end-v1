import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

// Define the Booking interface based on the API response
interface BookingSession {
  id: number;
  request_id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  updated_at: string;
  sessionNote?: {
    id: number;
    session_id: number;
    tutor_notes?: string;
    student_rating?: number;
    student_feedback?: string;
  };
}

interface Booking {
  id: number;
  student_id: number;
  tutor_id: number;
  course_id?: number;
  title: string;
  description?: string;
  mode: "online" | "offline";
  location?: string;
  meeting_url?: string;
  note?: string;
  hourly_rate: string;
  total_hours: string;
  total_amount: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "rejected";
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  tutor: {
    id: number;
    user_id: number;
    user: {
      id: number;
      first_name: string;
      last_name: string;
      avatar?: string;
    };
  };
  course?: {
    id: number;
    title: string;
    description?: string;
    hourly_rate: string;
    teaching_mode: string;
  };
  sessions: BookingSession[];
  payment?: {
    id: number;
    request_id: number;
    amount: string;
    payment_method: string;
    status: string;
    payment_date?: string;
    created_at: string;
    updated_at: string;
  };
}

interface UseStudentBookingsOptions {
  status?:
    | "all"
    | "pending"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "rejected";
}

/**
 * A custom hook to fetch the current student's bookings from the backend API
 *
 * @param options Optional parameters to filter bookings
 * @returns A query result object containing the bookings data, loading state, error, and refetch function
 */
export function useStudentBookingsQuery(
  options: UseStudentBookingsOptions = {}
) {
  const { status } = options;
  const { user } = useSelector((state: RootState) => state.auth);

  // Build the API URL with optional status parameter
  const buildApiUrl = () => {
    const url = new URL("/api/v1/bookings/student", window.location.origin);
    if (status && status !== "all") {
      url.searchParams.append("status", status);
    }
    return url.toString();
  };
  return useQuery<Booking[]>({
    queryKey: ["bookings", status || "all"],
    queryFn: async () => {
      // Check if user is logged in and is a student
      if (!user || user.role !== "student") {
        throw new Error(
          "You must be logged in as a student to view booking requests."
        );
      }

      const response = await apiRequest("GET", buildApiUrl());
      return response.json();
    },
    // Include standard React Query options
    refetchOnWindowFocus: false, // Don't refetch when the window gains focus
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    retry: 1, // Only retry failed requests once
  });
}

export default useStudentBookingsQuery;
