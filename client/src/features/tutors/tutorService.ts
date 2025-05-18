import { tutorProfiles } from "@shared/schema";

// Định nghĩa kiểu TutorProfile dựa trên schema tutorProfiles
type TutorProfile = {
  id: number;
  user_id: number;
  bio?: string | null;
  availability?: string | null;
  is_verified?: boolean;
  is_featured?: boolean;
  rating?: number;
  total_reviews?: number;
  created_at: string;
  updated_at: string;
};

// Create or update tutor profile
const createUpdateProfile = async (profileData: any): Promise<TutorProfile> => {
  const method = profileData.id ? "PATCH" : "POST";
  const response = await fetch("/api/v1/tutors/profile", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create/update profile");
  }

  const data = await response.json();
  return data.profile;
};

// Get tutor profile
const getProfile = async (): Promise<TutorProfile> => {
  const response = await fetch("/api/v1/tutors/profile", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Profile not found");
    }
    throw new Error("Failed to load tutor profile");
  }

  const data = await response.json();
  return data.profile;
};

const tutorService = {
  createUpdateProfile,
  getProfile,
};

export default tutorService;
