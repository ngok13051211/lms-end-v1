import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Subject } from "@shared/schema";
import SubjectCard from "@/components/ui/SubjectCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

// Extended type that aligns with our FeaturedSubject interface in SubjectCard
interface FeaturedSubjectsProps {
  subjects: Array<
    Subject & {
      education_levels?: Array<{
        name: string;
        id: number;
      }>;
    }
  >;
}

export default function FeaturedSubjects({ subjects }: FeaturedSubjectsProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollPrev = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -350, behavior: "smooth" });
    }
  };

  const scrollNext = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 350, behavior: "smooth" });
    }
  };

  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-light mb-2">
              Môn học <span className="font-medium text-primary">phổ biến</span>
            </h2>
            <p className="text-muted-foreground">
              Khám phá những môn học được nhiều người quan tâm nhất tại
              HomiTutor
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={scrollNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <div
            ref={sliderRef}
            className="flex overflow-x-auto pb-6 gap-5 snap-x snap-mandatory scrollbar-hide scroll-smooth hide-scrollbar"
            style={{
              scrollbarWidth: "none" /* Firefox */,
              msOverflowStyle: "none" /* IE and Edge */,
            }}
          >
            {subjects.length > 0 ? (
              subjects.slice(0, 10).map((subject) => (
                <div
                  key={subject.id}
                  className="min-w-[280px] sm:min-w-[300px] md:min-w-[320px] max-w-[320px] snap-start flex-shrink-0"
                >
                  <SubjectCard subject={subject} />
                </div>
              ))
            ) : (
              <div className="w-full text-center py-8">
                <p className="text-muted-foreground">
                  Chưa có môn học nào. Vui lòng quay lại sau.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-8">
          <Link href="/subjects">
            <Button
              variant="outline"
              className="hover:bg-gray-50 text-primary border-primary"
            >
              Xem tất cả môn học
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
