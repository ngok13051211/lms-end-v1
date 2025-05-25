// Interface for featured tutor data from API
export interface FeaturedTutorData {
  id: number;
  first_name: string;
  last_name: string;
  avatar: string | null;
  rating: number;
  total_reviews: number;
  bio: string | null;
  subjects: string[];
}

// Interface for API response
export interface FeaturedTutorsResponse {
  tutors: FeaturedTutorData[];
  success?: boolean;
}
