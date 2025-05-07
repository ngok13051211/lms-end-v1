import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Subject } from "@shared/schema";
import SubjectCard from "@/components/ui/SubjectCard";

interface FeaturedSubjectsProps {
  subjects: Subject[];
}

export default function FeaturedSubjects({ subjects }: FeaturedSubjectsProps) {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-light mb-2">
            Môn học <span className="font-medium text-primary">phổ biến</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Khám phá những môn học được nhiều người quan tâm nhất tại HomiTutor
          </p>
        </div>

        <div className="flex overflow-x-auto pb-6 -mx-4 px-4 space-x-6 md:grid md:grid-cols-3 md:gap-6 md:space-x-0">
          {subjects.length > 0 ? (
            subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))
          ) : (
            <div className="col-span-3 text-center py-8">
              <p className="text-muted-foreground">Chưa có môn học nào. Vui lòng quay lại sau.</p>
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <Link href="/subjects">
            <Button variant="outline" className="hover:bg-gray-50 text-primary border-primary">
              Xem tất cả môn học
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
