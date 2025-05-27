import { useQuery } from "@tanstack/react-query";

// Interface cho thông tin cơ bản của người dùng
interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone?: string;
  avatar?: string;
  address?: string;
  date_of_birth?: string;
  role: "student" | "tutor" | "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Interface cho yêu cầu dạy học
interface TeachingRequest {
  id: number;
  subject: {
    id: number;
    name: string;
  };
  level: {
    id: number;
    name: string;
  };
  introduction: string;
  experience: string;
  certifications?: string; // JSON string
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  approved_by?: {
    id: number;
    name: string;
    email: string;
  };
}

// Interface cho khóa học
interface Course {
  id: number;
  name: string;
  subject: {
    id: number;
    name: string;
  };
  level: {
    id: number;
    name: string;
  };
  status: "draft" | "published" | "archived";
  created_at: string;
  hourly_rate?: number;
}

// Interface cho chi tiết gia sư
interface TutorDetail {
  user: User;
  tutor_profile: {
    id: number;
    bio?: string;
    availability?: string;
    is_verified: boolean;
    rating: number;
    total_reviews: number;
  };
  teaching_requests: TeachingRequest[];
  courses: Course[];
}

// Interface cho phản hồi API
interface TutorDetailResponse {
  success: boolean;
  data?: TutorDetail;
  message: string;
}

export const useAdminTutorDetail = (tutorId?: number | string) => {
  return useQuery<TutorDetailResponse>({
    queryKey: ["admin-tutor-detail", tutorId],
    queryFn: async () => {
      if (!tutorId) throw new Error("Tutor ID is required");

      const response = await fetch(`/api/v1/admin/tutors/${tutorId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error:", errorText);
        throw new Error("Không thể tải thông tin chi tiết gia sư");
      }

      return response.json();
    },
    enabled: !!tutorId,
    staleTime: 30000, // 30 seconds
  });
};