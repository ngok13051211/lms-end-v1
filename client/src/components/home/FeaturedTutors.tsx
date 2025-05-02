import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { TutorProfile } from "@shared/schema";
import TutorCard from "@/components/ui/TutorCard";

interface FeaturedTutorsProps {
  tutors: TutorProfile[];
}

export default function FeaturedTutors({ tutors }: FeaturedTutorsProps) {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-light mb-2">
            Gia sư <span className="font-medium text-primary">nổi bật</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Những gia sư xuất sắc và được đánh giá cao nhất trên HomiTutor
          </p>
        </div>

        <div className="flex overflow-x-auto pb-6 -mx-4 px-4 space-x-6 md:grid md:grid-cols-3 md:gap-6 md:space-x-0">
          {tutors.length > 0 ? (
            tutors.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))
          ) : (
            <div className="col-span-3 text-center py-8">
              <p className="text-muted-foreground">No featured tutors available at the moment.</p>
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <Link href="/tutors">
            <Button variant="outline" className="hover:bg-gray-50 text-primary border-primary">
              Xem thêm gia sư
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
