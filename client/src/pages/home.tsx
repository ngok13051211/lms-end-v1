import HeroSection from "@/components/home/HeroSection";
import SearchSection from "@/components/home/SearchSection";
import FeaturedSubjects from "@/components/home/FeaturedTutors"; // Component renamed but file still named FeaturedTutors.tsx
import HowItWorks from "@/components/home/HowItWorks";
import SubjectCategories from "@/components/home/SubjectCategories";
import Testimonials from "@/components/home/Testimonials";
import BecomeTutor from "@/components/home/BecomeTutor";
import AppDownload from "@/components/home/AppDownload";
import FAQ from "@/components/home/FAQ";
import { useQuery } from "@tanstack/react-query";
import { subjects, educationLevels, tutorProfiles } from "@shared/schema";
import { Loader2 } from "lucide-react";

// Định nghĩa các kiểu dữ liệu dựa trên schema
type Subject = {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  tutor_count?: number;
  teaching_mode?: string;
  hourly_rate?: number | string;
  created_at?: string;
  updated_at?: string;
  education_levels?: Array<{
    id: number;
    name: string;
  }>;
};

type EducationLevel = {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

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

// Type đơn giản cho testimonials (chỉ hiển thị tĩnh)
type Testimonial = {
  id: number;
  name: string;
  role?: string;
  content: string;
  avatar?: string;
};

export default function Home() {
  const { data: tutors, isLoading: tutorsLoading } = useQuery<TutorProfile[]>({
    queryKey: ["/api/v1/tutors/featured"],
  });

  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/v1/subjects"],
  });

  const { data: educationLevels, isLoading: levelsLoading } = useQuery<
    EducationLevel[]
  >({
    queryKey: ["/api/v1/education-levels"],
  });

  const { data: testimonials, isLoading: testimonialsLoading } = useQuery<
    Testimonial[]
  >({
    queryKey: ["/api/v1/testimonials"],
  });

  const isLoading =
    tutorsLoading || subjectsLoading || levelsLoading || testimonialsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2 text-xl">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <HeroSection />
      <SearchSection
        subjects={subjects || []}
        educationLevels={educationLevels || []}
      />
      <FeaturedSubjects subjects={subjects || []} />
      <HowItWorks />
      <SubjectCategories subjects={subjects || []} />
      <Testimonials />
      <BecomeTutor />
      <AppDownload />
      <FAQ />
    </>
  );
}
