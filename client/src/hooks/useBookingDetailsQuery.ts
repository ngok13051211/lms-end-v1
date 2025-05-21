import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

// Define the SessionNote interface
interface SessionNote {
  id: number;
  session_id: number;
  tutor_notes?: string;
  student_rating?: number;
  student_feedback?: string;
  created_at: string;
  updated_at: string;
}

// Define the BookingSession interface
export interface BookingSession {
  id: number;
  request_id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  updated_at: string;
  sessionNote?: SessionNote;
}

// Define the Course interface
export interface Course {
  id: number;
  title: string;
  description?: string;
  subject: {
    id: number;
    name: string;
    category: string;
  };
  level: string;
  hourly_rate: string;
  teaching_mode: string;
  created_at: string;
  updated_at: string;
}

// Define the User interface
export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

// Define the Student interface - flattened without nested user object
export interface Student {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

// Define the Tutor interface
export interface Tutor {
  id: number;
  user_id: number;
  user: User;
  created_at: string;
  updated_at: string;
}

// Define the Payment interface
export interface Payment {
  id: number;
  request_id: number;
  amount: string;
  payment_method: string;
  status: string;
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

// Define the BookingDetails interface
export interface BookingDetails {
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
  student: Student;
  tutor: Tutor;
  course?: Course;
  sessions: BookingSession[];
  payment?: Payment;
}

/**
 * A custom hook to fetch booking details from the backend API
 *
 * @param bookingId The ID of the booking to fetch
 * @returns A query result object containing the booking details, loading state, error, and refetch function
 */
export function useBookingDetailsQuery(bookingId: string | undefined) {
  const { user } = useSelector((state: RootState) => state.auth);

  return useQuery<BookingDetails>({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      // Check if user is logged in
      if (!user) {
        throw new Error("You must be logged in to view booking details.");
      }

      // Check if bookingId is valid
      if (!bookingId) {
        throw new Error("Invalid booking ID.");
      }

      const response = await apiRequest("GET", `/api/v1/bookings/${bookingId}`);
      return response.json();
    },
    // Don't run the query if bookingId is undefined
    enabled: !!bookingId && !!user,
    // Don't refetch when the window gains focus
    refetchOnWindowFocus: false,
    // Consider data fresh for 5 minutes
    staleTime: 1000 * 60 * 5,
    // Only retry failed requests once
    retry: 1,
  });
}

export default useBookingDetailsQuery;
