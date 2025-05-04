import HeroSection from "@/components/home/HeroSection";
import SearchSection from "@/components/home/SearchSection";
import FeaturedTutors from "@/components/home/FeaturedTutors";
import HowItWorks from "@/components/home/HowItWorks";
import SubjectCategories from "@/components/home/SubjectCategories";
import Testimonials from "@/components/home/Testimonials";
import BecomeTutor from "@/components/home/BecomeTutor";
import AppDownload from "@/components/home/AppDownload";
import FAQ from "@/components/home/FAQ";
import { useQuery } from "@tanstack/react-query";
import { Subject, EducationLevel, TutorProfile, Testimonial } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { data: tutors, isLoading: tutorsLoading } = useQuery<TutorProfile[]>({
    queryKey: ['/api/v1/tutors/featured']
  });

  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ['/api/v1/subjects']
  });

  const { data: educationLevels, isLoading: levelsLoading } = useQuery<EducationLevel[]>({
    queryKey: ['/api/v1/education-levels']
  });
  
  const { data: testimonials, isLoading: testimonialsLoading } = useQuery<Testimonial[]>({
    queryKey: ['/api/v1/testimonials']
  });

  const isLoading = tutorsLoading || subjectsLoading || levelsLoading || testimonialsLoading;

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
      <SearchSection subjects={subjects || []} educationLevels={educationLevels || []} />
      <FeaturedTutors tutors={tutors || []} />
      <HowItWorks />
      <SubjectCategories subjects={subjects || []} />
      <Testimonials testimonials={testimonials || []} />
      <BecomeTutor />
      <AppDownload />
      <FAQ />
    </>
  );
}
